const express = require('express');
const app = express();
const fs = require('fs');
const _ = require('underscore');
const swig  = require('swig');
const mongoose = require('mongoose');
const bluebird =  require('bluebird');

//Cache tracker image
const img = fs.readFileSync('./public/img/a.gif');
const DEFAULT = process.env.DEFAULT_REDIRECT_URL || 'http://www.google.com';
const template = swig.compileFile('./public/redirect.html');


mongoose.Promise = bluebird;
mongoose.connect('mongodb://localhost/tracklinksdb');

const OPEN = 'open';
const CLICK = 'click';

const hitTypes = ['open', 'click'];

var hitsSinceLastRestart = 0;

var HitSchema = mongoose.Schema({
    time : { type : Date},
    campaign : String,
    link : String,
    customerEmail : String,
    customerName :String,
    ip : String,
    userAgent : String,
    hitType : {
        type: String,
        enum: hitTypes
    }
});
HitSchema.index({ time: 1, campaign: 1, link : 1, hitType : 1 });

var Hit = mongoose.model('Hit', HitSchema);

app.get('/o', function(req, res) {
    track(req, OPEN);
    res.writeHead(200, {'Content-Type': 'image/gif' });
    res.end(img, 'binary');
});


app.get('/*', function(req, res) {
    track(req, CLICK);
    const url = req.query.t || DEFAULT;
    if(isWindows(req)) {
        windowsRedirect(url, res);
    } else {
        res.redirect(302, url);
    }
});

var server = app.listen(80, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Link Tracker http://%s:%s', host, port);
});

const track = (req, hitType) => {
    try {
        console.log('Recording hit: ' + (++hitsSinceLastRestart));
        new Hit(createHit(req, hitType)).save((err, result) => {
            if(err) {
                console.error(err);
            }
        });
    } catch (err) {
        console.error('Error in recording hit');
        console.error(err);
    }
};

const createHit = (req, hitType) => {
    return {
        time : Date.now(),
        campaign : req.query.c,
        link : req.query.l,
        customerEmail : req.query.ce,
        customerName : req.query.cn,
        ip : req.ip,
        userAgent : req.headers['user-agent'],
        hitType : hitType
    };
};

const windows = 'windows';
const edge = 'edge';

const isWindows = (req) => {
    var userAgent = req.headers['user-agent'] || '';
    if(!userAgent) {
        return true;
    } else {
        userAgent = userAgent.toLowerCase();
        return userAgent.indexOf(edge) > -1 || userAgent.indexOf(windows) > -1;
    }
};

const windowsRedirect = (url, res) => {
    console.warn('windows redirect');
    res.set('Content-Type', 'text/html');
    res.status(200).send(template({
        redirect : url
    }));
};
