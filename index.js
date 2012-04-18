var child_process = require('child_process'),
    crypto = require('crypto'),
    path = require('path');

function subst(cmd, keys) {
  if (keys) {
    return cmd.replace(/\{(\w+)\}/g, function(match, item) {
      return keys[item];
    });
  } else {
    return cmd;
  }
}

module.exports.logger = console.log.bind(console);

module.exports.tmpname = function tmpname(pattern) {
  var tmpbase = process.env['TMPDIR'] || '/tmp';
  var tmpfile = pattern +
                crypto.randomBytes(6).toString('base64').replace('/', '-');
  return path.resolve(tmpbase, tmpfile);
}

module.exports.run = function run(cmd, keys) {
  return function (/* ..., callback */) {
    var callback = arguments[arguments.length - 1];
    cmd = subst(cmd, keys);
    module.exports.logger('executing: ' + cmd);
    child_process.exec(cmd, callback);
  };
}

module.exports.sync = function sync(f) {
  return function (/* ..., callback */) {
    var callback = arguments[arguments.length - 1];
    try {
      var value = f.apply(this, arguments);
    } catch(e) {
      return callback(e);
    }
    callback(null, value);
  };
}

module.exports.cd = function cd(dir, keys) {
  return module.exports.sync(function() {
    dir = subst(dir, keys);
    module.exports.logger('changing directory to: ' + dir);
    process.chdir(dir);
  });
}

module.exports.assign = function assign(key, keys) {
  return module.exports.sync(function(stdout) {
    keys[key] = stdout.trim();
  });
}
