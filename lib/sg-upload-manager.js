var path = require('path');
var fs = require('fs');
var async = require('async');
var formidable = require('formidable');

var fileRefiner = function (form) {
    return function(callback) {
        var self = this;
        form.parse(self, function (err, fields, files) {
            if (err) {
                return callback(err);
            }
            self.files = [];
            var isExceed = false;
            for (var k in files) {
                var file = files[k];
                if (file.size > 0 && file.size <= form.maxFieldsSize) {
                    self.files.push({
                        size: file.size,
                        path: file.path,
                        type: file.type,
                        name: file.name
                    });
                }
                else {
                    fs.unlink(file.path, function (err) {
                        if (err) {
                            console.error(err);
                        }
                    });
                }

                if (file.size > form.maxFieldsSize) {
                    isExceed = true;
                }
            }

            if (!self.body) self.body = {};
            for (k in fields) self.body[k] = fields[k];

            if (isExceed) {
                callback(new Error('exceed'));
            } else {
                callback(null);
            }
        });
    }
};

var removeLocalFiles = function (callback) {
    var files = this.files;
    if (files) {
        var funcs = [];
        for (var i = 0; i < files.length; ++i) {
            var file = files[i];
            (function (file) {
                funcs.push(function (n) {
                    fs.unlink(file.path, function (err) {
                        if (err) {
                            n(err, null);
                        }
                        n(null, true);
                    });
                });
            })(file);
        }
        async.parallel(funcs, function (err, results) {
            if (err) {
                console.error(err);
            }
            callback(err);
        });
    } else {
        callback(null);
    }
};

module.exports = function (dir, maxByte) {
    return function (req, res, next) {

        var form = new formidable.IncomingForm();
        form.keepExtensions = true;
        form.maxFieldsSize = maxByte;
        form.uploadDir = dir;

        req.refineFiles = fileRefiner(form);
        req.removeLocalFiles = removeLocalFiles;
        next();
    };
};


