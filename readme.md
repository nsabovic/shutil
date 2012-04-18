# Shutils

## What?

Helper functions for running shell commands from node.js.

## Why?

Obviously writing shell scripts is best done in shell. Except when you need some
functionality that shell doesn't have, like parsing JSON, or using one of the
gazillion modules available for node.

## How?

An dumbified version of a script that creates a tarfile for a project:

    #!/usr/bin/env node
    var fs = require('fs'),
        async = require('async'),
        sh = require('./shutil');

    var vars = {
      REPO: "git@myproject.com/repo.git",
      VERSION: null,
      CURDIR: process.cwd(),
      TMPDIR: sh.tmpname('myproject'),
    }

    process.on('SIGINT', function() {}); // Just pass SIGINT down.

    async.waterfall([
      sh.run('mkdir {TMPDIR}', vars),
      sh.cd('{TMPDIR}', vars),
      sh.run('git clone --recursive {REPO} .', vars),
      sh.run('git describe --tags'),
      sh.assign('VERSION', vars),
      sh.sync(function() {
        var package = JSON.parse(fs.readFileSync('package.json'));
        return package.engines.node.match(/\s*[=v]?\s*(\d+\.\d+\.\d+)/)[1];
      }),
      sh.assign('NODE_VERSION', vars),
      sh.run('echo {NODE_VERSION} >NODE_VERSION', vars),
      sh.run('find . -name .git\\* -print0 | xargs -0 rm -rf'),
      sh.run('tar czf {CURDIR}/myproject-{VERSION}.tar.gz .', vars)],

      function(err) {
        async.series([sh.run('rm -rf {TMPDIR}', vars)], function() {
          if (err) {
            console.error(err);
            process.exit(1);
          } else {
            console.log("success");
          }
        })
      });

## Methodology

shutil provides a few functions that, when called, generate function which run
a command and then call a callback with the result of that command. For example:

    var f = sh.run('mkdir test');

    f(function(err, stdout, stderr) {
      if (err) {
        console.error("Failed");
      } else {
        console.log("Result: " + stdout);
      }
    });

sh.sync() can be used to stick in synchronous JavaScript code which is run
inside try/catch.

Let's say we want to use the result of one function in another. This won't work:

    var value = false;
    async.waterfall([
      sh.run('rm test'),
      sh.sync(function() { value = true; }),
      sh.run('echo value is ' + value),
    ]);

It will always print false -- we need to evaluate value lazily. This is why
all the functions support simple templating:

    sh.run('echo {a} is {b}', { a : 'templating', b : 'awesome' });

There's no escape characters, so if you need braces, stick them in vars, like:

    sh.run('echo left brace: {L}, right one: {R}', { L : '{', R : '}' });

## Functions

`shutil.run(cmd[, vars])`

Runs the given shell command.

`shutil.cd(dir[, vars])`

Changes the current working directory to dir.

`shutil.sync(f)`

Runs the given function synchronously, and call a callback afterwards. Only
useful if your async library doesn't catch exceptions itself.

`shutil.assign(keyname, vars)`

Grab the first parameter out passed to it (stdout, if it were called by one of
the other functions), trim it, and store it under keyname in vars.

## Helper functions

These do not generate other functions, just return values.

`shutil.tmpname(prefix)`

Generate a temporary filename (under $TMPDIR or /tmp) with given prefix.

`shutil.logger`

Set this variable to the logging function that will be called before each run
and cd. Set it to `function(){}` to turn off logging. It's console.log by
default.
