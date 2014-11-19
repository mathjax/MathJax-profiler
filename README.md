# MathJax-profiler


This repository contains the MathJax profiler and a sample 
HTML file visually rendering the profiling data.

* `MathJax-Profiler.js`: the profiler
* `test/Performance-Test.html`, `test/performance.js`: example for visualizing profiler data
 
See the comments in `MathJax-Profiler.js` for how to send 
the data collected on the client back to your server.

# Example using Google Analytics

Google Analytics can collect [custom user timings](https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingTiming). The profiler can easily be set up to provide the necessary data. Simply load it after GA and before MathJax.js and specify which data to include.

For a simple example, a `Data_Saver` function as below will collect 3 basic timings:

* loading of MathJax.js
* Overall timing -- loading up of components as well as typesetting. ("Startup")
* just typesetting ("Typeset")

To add more timings, you simply pick more values from the `events` object.

```javascript
function Data_Saver() {
    for (var b = MathJax.Extension.Profiler, c = b.events, d = 0, e = c.length; e > d; d++) {
        var f = c[d].n,
            g = c[d].s,
            h = c[d].e;
        if ("Startup" === f) {
            var i = h - g;
            _gaq.push(["_trackTiming", "MathJax", f, i, document.URL])
        }
        if ("Typeset" === f) {
            var i = h - g;
            _gaq.push(["_trackTiming", "MathJax", f, i, document.URL]), _gaq.push(["_trackTiming", "MathJax", "Total time", h, document.URL])
        }
        "MathJax.js" === f && _gaq.push(["_trackTiming", "MathJax", f, c[d].c, document.URL])
    }
}
