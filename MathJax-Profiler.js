/*
 *  MathJax-Profiler.js
 *
 *  Copyright (c) 2014 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


//
//  See the comments at the bottom for details of hooking this into your system.
//  This file should be loaded BEFORE MathJax.js is loaded, and as close to it
//  as possible.
//

var MathJax = {
  Profiler: {}, //  for our configuration data

  //
  //  This handles all the profiling actions, and is called before
  //  MathJax starts its action queue.
  // 
  AuthorInit: function () {
    var HUB = MathJax.Hub, AJAX = MathJax.Ajax
    //
    //  The types for the different events
    //
    var TYPES = {file:"f", startup:"s", hub:"h", math:"m", font:"w", jax:"j"};
    
    var START = MathJax.AuthorConfig.Profiler.scriptTime;         // the starting time
    var TIME = function () {return new Date().getTime() - START}  // time since start

    //
    //  The main data object for the profiler
    //
    var PROFILER = MathJax.Extension.Profiler = {
      version: "1.0",
      URL: window.location.toString(),                // page in question
      userAgent: navigator.userAgent,                 // browser's userAgent
      browser: HUB.Browser+" "+HUB.Browser.version,   // MathJax's identification of browser
      files: 1,                                       // number of files loaded
      fonts: 0,                                       // number of web fonts loaded
      eqns: 0,                                        // equations processed
      errors: 0,                                      // number of math processing errors
      fileErrors: 0,                                  // number of file load errors
      missingChars: 0,                                // number of characters not in the fonts
      events: [                                       //       The list of events starting
        {n:"MathJax.js", T:TYPES.file, s:0, c:TIME(), S:1} //   with the MathJax.js file
      ]
    }
    //
    //  Events in progress (started but not ended yet)
    //
    var EVENT = {
      FILES: {"MathJax.js":PROFILER.events[0]},
      HUB: {},
      STARTUP: {},
      MATH: {}
    };
    //
    //  Hook into the Startup signal
    //
    var sInterest = HUB.Startup.signal.Interest(function (message) {
      var name = (typeof(message) === "string" ? message : message[0]), file, jax;
      var event = {n:name, T:TYPES.startup, t:TIME()}; // The new event

      if (name.substr(0,5) === "Begin") {
        //
        //  The beginning of a BEGIN/END pair
        //
        name = event.n = name.replace(/^Begin ?/,""); if (!name) {event.n = "Startup"}
        event.s = event.t; delete event.t;
        EVENT.STARTUP[name] = event;  // save it so END can find it

      } else if (name.substr(0,3) === "End") {
        //
        //  The ending of a BEGIN/END pair
        //
        name = name.replace(/^End ?/,"");
        if (EVENT.STARTUP[name]) {
          EVENT.STARTUP[name].e = event.t;
          delete EVENT.STARTUP[name];
          if (name === "") {
            //
            //  This is the last event of MathJax starting up, so
            //  save the complete time to the top level of the data
            //
            PROFILER.time = event.t;
          }
          event = null;
        }

      } else if (name.match(/^[^ ]* Jax (Config|Require|Startup|Ready)$/)) {
        //
        //  A Jax startup message: Config, Require, Startup, or Ready.
        //  (Save the data in the file event for the jax, if there is one.)
        //
        jax = (name.split(/ /))[0];
        file = EVENT.FILES["jax/element/"+jax+"/jax.js"] ||
               EVENT.FILES["jax/input/"+jax+"/jax.js"] ||
               EVENT.FILES["jax/output/"+jax+"/jax.js"];
        if (file) {
          file[name.substr(jax.length+5).toLowerCase()] = TIME();
          file.T = TYPES.jax;
          event = null;
        }

      } else if (name.match(/ Ready$/)) {
        //
        //  An extension becoming ready
        //  (Save the time in the file event, if there is one.)
        //
        file = name.replace(/ Ready$/,"").replace(/ /g,"/");
        var auto = file.replace(/\//,"/autoload/");
        file = EVENT.FILES["extensions/"+file+".js"] || EVENT.FILES["jax/output/"+auto+".js"];
        if (file) {file.ready = TIME(); event = null}

      } else if (name.match(/- Web[- ]Font /i)) {
        //
        //  A web font message (already handled via loadWebFont below)
        //
        event = null;
      }
      if (event) PROFILER.events.push(event); // save the event
    });
    
    //
    //  This handles HUB messages, which include New Math messages.
    //  Since there is no begin/end for new math, we take the time between
    //  messages as indicating the tie for the math.
    //
    var lastEvent = START, lastTop = 1, saveTop = false;
    var hInterest = HUB.signal.Interest(function (message) {
      var name = (typeof(message) === "string" ? message : message[0]);
      var event = {n:message[0], T:TYPES.hub, t:TIME()}; // The new event

      if (name === "New Math" || name === "New Math Pending") {
        //
        //  For new math, the start time is the end time of the last event.
        //  We insert the math event earlier if it started font or file events
        //    so that the events come in oder of start times.
        //
        event.T = TYPES.math; event.n = "New Math";
        event.s = lastEvent; event.e = event.t;
        event.i = message[1].replace(/MathJax-Element-/,"");
        delete event.t;
        if (EVENT.MATH[event.i]) {
          delete EVENT.MATH[event.i];
          event = null;
        } else {
          if (name === "New Math Pending") EVENT.MATH[event.i] = true;
          if (lastTop !== PROFILER.events.length) {
            PROFILER.events.splice(lastTop,0,event);
            event = null;
          }
          saveTop = true;
          PROFILER.eqns++;
        }

      } else if (name.substr(0,5) === "Begin") {
        //
        //  The beginning of a BEGIN/END pair
        //
        if (name === "Begin Math Output") {saveTop = true}
        name = event.n = name.replace(/^Begin ?/,"");
        event.s = event.t; delete event.t;
        EVENT.HUB[name] = event;  // save it so END can find it

      } else if (name.substr(0,3) === "End") {
        //
        //  The ending of a BEGIN/END pair
        //
        name = name.replace(/^End ?/,"");
        if (EVENT.HUB[name]) {
          EVENT.HUB[name].e = event.t;
          delete EVENT.HUB[name]; event = null;
        }

      } else if (name === "TeX Jax - parse error" || name === "Unprocessed TeX") {
        //
        //  A TeX parsing error or macros unprocessed
        //
        event.n = name.replace(/Jax - /,"");
        event.m = message[1];
        event.i = MathJax.ElementJax.mml.SUPER.ID+1; // the expected ID for the math

      } else if (name === "TeX Jax - undefined control sequence") {
        //
        //  An undefined macro from noUndefined
        //
        event.n = name.replace(/TeX Jax - u/,"U") + " " + message[1];
        event.i = MathJax.ElementJax.mml.SUPER.ID+1; // the expected ID for the math

      } else if (name.match(/- unknown char$/)) {
        //
        //  An unknown character was used.
        //  (record the variant, style, and weight)
        //
        event.n = "Unkown Char U+"+message[1].toString(16).toUpperCase();
        event.v = message[2].fonts.toString();
        if (message[2].italic) {event.it = true}
        if (message[2].bold) {event.bf = true}
        PROFILER.missingChars++;

      } else if (name === "file load error") {
        //
        //  We will record this with loadComplete() below
        //
        if (EVENT.FILES[SHORTFILE(message[1])]) {event = null}
      }
      if (event) PROFILER.events.push(event);
      //
      //  This is so the New Math event can be placed at the correct
      //    location in the event array when it arrives
      //
      if (saveTop) {
        lastEvent = TIME();
        lastTop = PROFILER.events.length;
        saveTop = false;
      }
    });
    
    //
    //  This removes the root directory from the file path (to save space)
    //
    var SHORTFILE = function (file) {
      file = file.replace(/\[MathJax\]\//,"");
      if (file.substr(0,HUB.config.root.length) === HUB.config.root)
        {file = file.substr(HUB.config.root.length+1)}
      return file;
    }
    
    var REPLACED = [];  // functions to put back when done
    //
    //  Replace a method with a new one
    //
    var REPLACE = function (obj,method,fn) {
      var FN = obj[method];
      REPLACED.push([obj,method,FN]);
      obj[method] = fn;
      return FN;
    };
    //
    //  Put back the replaced functions
    //
    var CLEANUP = function () {
      for (var i = 0, m = REPLACED.length; i < m; i++)
        {var hook = REPLACED[i]; hook[0][hook[1]] = hook[2]}
    }

    //
    //  Hook into the AJAX loader to record file events.
    //
    var JS = REPLACE(AJAX.loader,"JS",function (file,callback) {
      var FILE = SHORTFILE(file);
      var event = {n:FILE, T:TYPES.file, s: TIME(), c:0};
      EVENT.FILES[FILE] = event; PROFILER.events.push(event);
      return JS.apply(this,arguments);
    });
    //
    //  Hook into loadComplete to finish file events
    //
    var COMPLETE = REPLACE(AJAX,"loadComplete",function (file) {
      var event = EVENT.FILES[SHORTFILE(file)]||{};
      event.c = TIME();
      event.S = this.loading[this.fileURL(file)].status || this.STATUS.OK;
      if (event.S !== this.STATUS.OK)
        {PROFILER[event.t === TYPES.font ? "fontErrors" : "fileErrors"]++}
      return COMPLETE.apply(this,arguments);
    });
    //
    //  Hook into Preloading so combinined configuration
    //  files will have event for the files they contain.
    //
    var PRELOADING = REPLACE(AJAX,"Preloading",function () {
      var time = TIME();  // Since all these files are in the same load,
                          //   we don't really know when they each start,
                          //   so fake it by starting them all now.
      for (var i = 0, m = arguments.length; i < m; i++) {
        var name = String(arguments[i]).replace(/\[MathJax\]\//,"");
        var event = {n:name, T:TYPES.file, s:time, c:0, S:0}
        EVENT.FILES[name] = event; PROFILER.events.push(event);
      }
      return PRELOADING.apply(this,arguments);
    });
    
    //
    //  Hook into the HTML-CSS font loading code
    //
    HUB.Register.StartupHook("HTML-CSS Jax Startup",function () {
      var HTMLCSS = MathJax.OutputJax["HTML-CSS"];
      var FONT = HTMLCSS.Font;
      //
      //  Record a web font being loaded
      //
      var LOAD = REPLACE(FONT,"loadWebFont",function (font) {
        var name = HTMLCSS.fontInUse.replace(/^TeX$/,"MathJax")+"_"+font.directory.replace(/\//,"-");
        var event = {n:name, T:TYPES.font, s:TIME(), c:0};
        EVENT.FILES[font.directory] = event;
        PROFILER.events.push(event); PROFILER.fonts++;
        return LOAD.apply(this,arguments);
      });
      //
      //  Record when the web font is available
      //
      var COMPLETE = REPLACE(FONT,"loadComplete",function (font,n,done,status) {
        var event = EVENT.FILES[font.directory]||{}; delete EVENT.FILES[font.directory];
        event.c = TIME(); event.S = status;
        return COMPLETE.apply(this,arguments);
      });
    });
    //
    //  Hook into the TeX internalText to check for TeX commands not processed
    //
    HUB.Register.StartupHook("TeX Jax Startup",function () {
      var MML = MathJax.ElementJax.mml;
      var PARSE = MathJax.InputJax.TeX.Parse;
      var INTERNAL = REPLACE(PARSE.prototype,"InternalText",function (text,def) {
        if (text.match(/[{}\\`^_~]/)) {HUB.signal.Post(["Unprocessed TeX",text])}
        return INTERNAL.apply(this,arguments);
      });
    });
    //
    //  When the initial typesetting is complete, remove all the hooks
    //  so that we don't record events for typing answers, etc.  (That would
    //  generate a huge amount of data that probably isn't very helpful.)
    //
    HUB.Register.StartupHook("End",function () {
      CLEANUP();
      HUB.Startup.signal.NoInterest(sInterest);
      HUB.signal.NoInterest(hInterest);
      Data_Saver(PROFILER);            //  <=== This is for saving the data
    });
  }
}
MathJax.Profiler.scriptTime = new Date().getTime();


//
//  If you want to change the name of this to something else, 
//  or hook into your own system in another way, be sure
//  to change the call marked above.
//  
function Data_Saver(data) {
  //
  //  Do whatever you need to do to save the
  //    data object to the server.
  //    The data.events object is the large
  //      collection of event information.
  //    All other top-level properties can be
  //      database columns on which we could
  //      do searches (e.g., errors, number of
  //      equations, missing characters, etc).
  // 
  
  /* Do something with this */

    JSON.stringify(data);
}
