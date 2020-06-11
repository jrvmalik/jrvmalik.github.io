// onload function
function onload() {

    // signal input element
    const signalInputElement = document.getElementById("signalInput");

    // annotation input element
    const annotationInputElement = document.getElementById("annotationInput");

    // ready button element
    const readyButton = document.getElementById("ready");

    // listen for button press and then call to proceed
    readyButton.addEventListener("click", onReady);

    // callback for ready button
    function onReady() {

        // signal file
        const signalFile = signalInputElement.files;

        // parse signal file (if given)
        if (signalFile.length > 0) {
            Papa.parse(signalFile[0], {
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function (results, file) {
                    const signal = results.data[0];

                    // annotation file
                    const annotationFile = annotationInputElement.files;

                    // parse annotation file (if given)
                    if (annotationFile.length > 0) {
                        Papa.parse(annotationFile[0], {
                            dynamicTyping: true,
                            skipEmptyLines: true,
                            complete: function (results, file) {
                                var annotation = results.data[0];
                                beginAnnotation(signal, annotation)
                            }
                        });
                    } else { // no annotation provided; proceed anyways with empty array
                        var annotation = []
                        beginAnnotation(signal, annotation)
                    }


                }
            });
        };

    }

    // annotation action
    function beginAnnotation(sig, anno) {

        // get canvas and RR canvas
        var canvas = document.getElementById('canvas');
        var RRCanvas = document.getElementById('RRCanvas');

        // get window size
        var w = document.documentElement.clientWidth;
        w = Math.min(1080, w); // at most 1080 pixels

        // set canvas dimensions
        canvas.width = 5 * w; // bump up resolution by five times
        canvas.style.width = w + "px";
        canvas.height = 2400;
        canvas.style.height = "480px"; // fixed at 480 pixels

        // same dimensions for RR canvas
        RRCanvas.width = canvas.width;
        RRCanvas.style.width = canvas.style.width;
        RRCanvas.height = 2400;
        RRCanvas.style.height = "480px";

        // get 2d context on canvas
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 5; // make sure lines will show up
        ctx.fillStyle = "#0E47D6"; // marker color

        // get 2d context on RR canvas
        var RRCtx = RRCanvas.getContext('2d');
        RRCtx.lineWidth = 5; // make sure lines will show up


        // initialize plotting preferences
        var Fs;
        var start;
        var frame;
        var finish;

        // get plotting preferences
        function getPlottingPreferences() {

            // sampling rate
            Fs = document.getElementById("hertz").value;

            // length of signal to be plotted (in samples)
            frame = Math.min(sig.length, document.getElementById("frame").value * Fs);
            frame = Math.max(frame, Fs);
            document.getElementById("frame").value = frame / Fs;

            // first sample to be plotted (index from 1)
            start = Math.round(document.getElementById("startTime").value * Fs) + 1;
            start = Math.max(1, start);
            start = Math.min(sig.length - frame + 1, start);
            document.getElementById("startTime").value = (start - 1) / Fs;

            // last sample to be plotted
            finish = start - 1 + frame;

        }

        // update plot
        getPlottingPreferences();
        plotAction(sig.slice(start - 1, finish));
        plotRR();

        function plotAction(sg) {

            // clear the current plot
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // get annotations in this window
            var an = [];
            for (annoIndex = 0; annoIndex < anno.length; annoIndex++) {
                if (anno[annoIndex] >= start && anno[annoIndex] < finish) {
                    an.push(anno[annoIndex]);
                }
            }

            // plot line on canvas
            if (sg.length > 0) {

                // normalize signal
                var YMax = Math.max(...sg);
                var YMin = Math.min(...sg);
                YMax = YMax + 0.04 * (YMax - YMin); // some whitespace padding
                YMin = YMin - 0.04 * (YMax - YMin);
                var XMax = sg.length - 1;
                var XMin = 0;

                // to change units of pixels
                function transformX(x) {
                    return Math.round((x - XMin) / (XMax - XMin) * (canvas.width - 1));
                }

                function transformY(y) {
                    var tmp = 1 - (y - YMin) / (YMax - YMin); // normalize and reflect
                    return Math.round(tmp * (canvas.height - 1));
                }

                // plot first point of sg
                ctx.beginPath()
                ctx.moveTo(transformX(0), transformY(sg[0]))

                // plot remaining points of sg
                var sampleIndex;
                for (sampleIndex = 1; sampleIndex < sg.length; sampleIndex++) {
                    ctx.lineTo(transformX(sampleIndex), transformY(sg[sampleIndex]));
                }
                ctx.stroke(); // linearly interpolate

                // plot markers on canvas
                if (an.length > 0) {

                    for (anIndex = 0; anIndex < an.length; anIndex++) {
                        ctx.beginPath();
                        ctx.arc(transformX(an[anIndex] - start + 1), transformY(sg[an[anIndex] - start + 1]), 20, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }

            }
        }

        function plotRR() {

            // clear the current plot
            RRCtx.clearRect(0, 0, RRCanvas.width, RRCanvas.height);

            // make a border
            RRCtx.beginPath();
            RRCtx.rect(0, 0, RRCanvas.width, RRCanvas.height);
            RRCtx.strokeStyle = "#000000"; // line color
            RRCtx.stroke();

            // plot RR time series on canvas (while calculating)
            if (anno.length > 1) {

                // calculate RR time series
                var RR = [];
                var ii;
                for (ii = 1; ii < anno.length; ii++) {
                    RR.push(anno[ii] - anno[ii - 1]);
                }

                // normalize signal
                var YMax = Math.max(...RR);
                var YMin = Math.min(...RR);
                YMax = YMax + 0.04 * (YMax - YMin); // some whitespace padding
                YMin = YMin - 0.04 * (YMax - YMin);
                var XMax = sig.length; //Math.max(...anno) + Fs;
                var XMin = 1; // Math.min(...anno);

                // to change units of pixels
                function transformX(x) {
                    return Math.round((x - XMin) / (XMax - XMin) * (RRCanvas.width - 1));
                }

                function transformY(y) {
                    var tmp = 1 - (y - YMin) / (YMax - YMin); // normalize and reflect
                    return Math.round(tmp * (RRCanvas.height - 1));
                }

                // plot first point of RR
                RRCtx.beginPath()
                RRCtx.moveTo(transformX(anno[1]), transformY(RR[0]))

                // plot remaining points of sg
                for (ii = 1; ii < RR.length; ii++) {
                    RRCtx.lineTo(transformX(anno[ii + 1]), transformY(RR[ii]));
                }
                RRCtx.strokeStyle = "#860010"; // line color
                RRCtx.stroke(); // linearly interpolate

            }

        }

        // manage key presses (for shifting frame)
        document.addEventListener('keydown', processKey);

        function processKey(event) {
            switch (event.code) {
                case "ArrowLeft":
                    // shift left
                    start = Math.max(1, start - Math.round(frame / 2));
                    document.getElementById("startTime").value = (start - 1) / Fs;
                    finish = start - 1 + frame;
                    plotAction(sig.slice(start - 1, finish));
                    break;
                case "ArrowRight":
                    // shift right
                    start = Math.min(sig.length - frame + 1, start + Math.round(frame / 2));
                    document.getElementById("startTime").value = (start - 1) / Fs;
                    finish = start - 1 + frame;
                    plotAction(sig.slice(start - 1, finish));
                    break;
                default:
                    // no match
            }
        }

        // update button element
        var updateButton = document.getElementById("update");
        updateButton.addEventListener("click", function () {
            getPlottingPreferences();
            plotAction(sig.slice(start - 1, finish));
        });

        // save button element
        var saveButton = document.getElementById("done");

        // listen for button press and then call to proceed
        saveButton.addEventListener("click", function () {
            var blob = new Blob([anno], {
                type: 'text/csv; encoding:utf-8'
            });
            saveAs(blob, "anno" + signalInputElement.files[0].name);
        });


        // get coordinates of click on object
        function getElementPosition(obj) {
            var curleft = 0;
            if (obj.offsetParent) {
                do {
                    curleft += obj.offsetLeft;
                } while (obj = obj.offsetParent);
                return curleft;
            }
            return undefined;
        };

        // callback function for click on canvas (plot)
        function getEventLocation(element, event) {
            return event.pageX - getElementPosition(element);
        };

        // add click sensitivity to canvas and carry out annotation adjustment
        canvas.addEventListener("click", function (event) {
            var XPixel = getEventLocation(this, event) * 5; // indexed from zero
            var XSample = Math.round(XPixel / (canvas.width - 1) * frame + start); // indexed from 1
            // see if within range of a marker
            var rIndex;
            var distance;
            for (rIndex = 0; rIndex < anno.length; rIndex++) {
                distance = Math.abs(XSample - anno[rIndex]) / frame * (canvas.width - 1); // in pixels
                if (distance <= 30) { // markers have 20 pixel radius
                    // found a close marker
                    anno.splice(rIndex, 1);
                    plotAction(sig.slice(start - 1, finish));
                    plotRR();
                    break;
                }
                if (anno[rIndex] > XSample) {
                    anno.splice(rIndex, 0, XSample);
                    plotAction(sig.slice(start - 1, finish));
                    plotRR();
                    break;
                }
            }

        });

        // add click sensitivity to RR canvas and carry out zoom adjustment
        RRCanvas.addEventListener("click", function (event) {
            var XPixel = getEventLocation(this, event) * 5; // indexed from zero
            var XSample = Math.round(XPixel / (canvas.width - 1) * frame + start); // indexed from 1

            // adjust start time
            start = XSample - frame / 2;
            start = Math.max(1, start);
            start = Math.min(sig.length - frame + 1, start);
            document.getElementById("startTime").value = (start - 1) / Fs;

            // adjust finish time
            finish = start - 1 + frame;

            // replot
            plotAction(sig.slice(start - 1, finish));

        });

    }

}