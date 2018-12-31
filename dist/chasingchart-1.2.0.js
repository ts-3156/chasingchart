/*
 Chasingchart JS v1.2.0 (2018-12-31)

 (c) 2018 Teruki Shinohara

 License: github.com/ts-3156/chasingchart/blob/master/LICENSE
*/
var Chasingchart = {};

Chasingchart.chart = function (_selector, _options) {
    var input = null;
    var inputIndex = 0;
    var chart = null;
    var started = false;
    var stopped = false;
    var duration = _options && _options.duration || 750;
    var selector = _selector;
    var colors = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075"];

    var formatter = function formatter() {
        // return Highcharts.numberFormat(this.y, 0, '', ',');
        var v = this.y;
        if (v > 10000000000) {
            v = Math.floor(v / 1000000000) + "G";
        } else if (v > 10000000) {
            v = Math.floor(v / 1000000) + "M";
        } else if (v > 10000) {
            v = Math.floor(v / 1000) + "K";
        } else {
            v = Math.floor(v);
        }
        return v;
    };

    var deepCopy = function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    // TODO Avoid using lodash
    var merge = function merge(src1, src2) {
        // return Object.assign(deepCopy(src1), deepCopy(src2));
        return _.merge(deepCopy(src1), deepCopy(src2));
    };

    var baseSeries = [{
        name: 'Series 1',
        animation: { duration: duration },
        data: [],
        dataLabels: {
            align: 'right',
            enabled: true,
            defer: true
        }
    }];

    var baseOptions = {
        chart: {
            type: 'bar'
        },
        title: {
            text: null
        },
        subtitle: {
            text: null
        },
        xAxis: {
            categories: [],
            title: {
                text: null
            }
        },
        yAxis: {
            min: 0,
            endOnTick: false,
            // maxPadding: 0.0,
            labels: {
                rotation: 0
            },
            title: {
                text: null
            }
        },
        tooltip: {
            enabled: false
        },
        exporting: false,
        credits: false,
        legend: false,
        series: null
    };

    var formatInputData = function formatInputData(input) {
        var categoryColors = {};
        input[0].categories.forEach(function (category, i) {
            categoryColors[category] = colors[i % colors.length];
        });

        var sortedInput = [];

        input.forEach(function (elem, i) {
            var ary = [];
            elem.values.forEach(function (value, j) {
                ary[j] = { value: value, category: elem.categories[j] };
            });

            ary.sort(function (a, b) {
                return b.value - a.value;
            });

            var sortedElem = { values: [], categories: [] };
            ary.forEach(function (obj, i) {
                sortedElem.values[i] = { y: obj.value, color: categoryColors[obj.category] };
                sortedElem.categories[i] = obj.category;
            });

            if (elem.options) {
                sortedElem.options = deepCopy(elem.options);
            } else {
                sortedElem.options = {};
            }

            sortedInput[i] = sortedElem;
        });

        return sortedInput;
    };

    var countUp = function countUp(duration, animation, startedCallback, finishedCallback) {
        var maxLoopCount = 24;
        var interval = duration / maxLoopCount;
        var loopCount = 0;

        var values = [];
        chart.series[0].data.forEach(function (d, i) {
            values[i] = d.y; // Sorted by value
        });

        var nextValues = [];
        chart.xAxis[0].categories.forEach(function (c, i) {
            input[inputIndex].categories.forEach(function (cc, j) {
                if (c === cc) {
                    nextValues[i] = input[inputIndex].values[j].y; // Sorted by current value
                }
            });
        });

        if (!animation) {
            chart.series[0].setData(nextValues, true, { duration: duration });
            if (startedCallback) {
                startedCallback();
            }
            if (finishedCallback) {
                setTimeout(function () {
                    finishedCallback();
                }, duration);
            }

            return;
        }

        var animate = function animate() {
            var tmpValues = [];
            values.forEach(function (v, i) {
                if (loopCount >= maxLoopCount - 1) {
                    tmpValues[i] = nextValues[i];
                } else {
                    if (v === nextValues[i]) {
                        tmpValues[i] = v;
                    } else {
                        var diff = parseFloat(loopCount + 1) * Math.abs(v - nextValues[i]) / maxLoopCount;
                        if (v < nextValues[i]) {
                            tmpValues[i] = v + diff;
                        } else {
                            tmpValues[i] = v - diff;
                        }
                    }
                }
            });

            chart.series[0].setData(tmpValues, true, { duration: interval });
            loopCount++;

            if (loopCount >= maxLoopCount) {
                clearInterval(timer);
                if (finishedCallback) {
                    finishedCallback();
                }
            }
        };

        animate();
        var timer = setInterval(animate, interval);

        if (startedCallback) {
            startedCallback();
        }
    };

    var rotateBars = function rotateBars(duration, callback) {
        var points = chart.series[0].points;
        var ticks = chart.xAxis[0].ticks;

        var values = [];
        var categories = chart.xAxis[0].categories;
        chart.series[0].data.forEach(function (d, i) {
            values[i] = { value: d.y, category: categories[i] }; // Sorted by value
        });

        var sortedValues = [];
        chart.xAxis[0].categories.forEach(function (c, i) {
            input[inputIndex].categories.forEach(function (cc, j) {
                if (c === cc) {
                    sortedValues[i] = { value: input[inputIndex].values[j].y, category: c }; // Sorted by current value
                }
            });
        });

        sortedValues.sort(function (a, b) {
            return b.value - a.value;
        });

        // TODO Don't call rotateBars right after calling countUp.
        //  Because chart.series[0].setData overwrite the positions of bars.

        var isChanged = false;
        values.forEach(function (value, i) {
            if (value.category !== sortedValues[i].category) {
                isChanged = true;
            }
        });
        if (!isChanged) {
            console.log('rotateBars', 'not changed');
            if (callback) {
                callback();
            }
            return;
        }

        values.forEach(function (value, i) {
            sortedValues.forEach(function (sValue, j) {
                if (value.category === sValue.category && i !== j) {
                    console.log('rotateBars', value.category, i, j);
                    points[i].graphic.animate({
                        x: points[j].shapeArgs.x
                    }, { duration: duration });

                    points[i].dataLabel.animate({
                        y: points[j].dataLabel.y
                    }, { duration: duration });

                    ticks[i].label.animate({
                        y: ticks[j].label.xy.y
                    }, { duration: duration });
                }
            });
        });

        if (callback) {
            setTimeout(function () {
                callback();
            }, duration);
        }
    };

    var reDraw = function reDraw(series, categories, options, callback) {
        options.xAxis.categories = categories;
        options.series = series;

        chart.destroy();
        chart = Highcharts.chart(selector, options);

        if (callback) {
            callback();
        }
    };

    var update = function update(callback) {
        if (input.length - 1 <= inputIndex) {
            started = false;
            if (callback) {
                callback();
            }
            return;
        }
        inputIndex++;

        var nextSeries = deepCopy(baseSeries);
        nextSeries[0].data = input[inputIndex].values;
        nextSeries[0].dataLabels.formatter = formatter;

        var options = deepCopy(baseOptions);
        if (input[inputIndex].options) {
            options = merge(options, input[inputIndex].options);
        }

        countUp(duration, true, function () {
            // TODO Can't run countUp and rotateBars simultaneously
        }, function () {
            rotateBars(Math.floor(duration * 0.8), function () {
                nextSeries[0].animation = false;
                reDraw(nextSeries, input[inputIndex].categories, options, function () {
                    if (stopped) {
                        started = false;
                        if (callback) {
                            callback();
                        }
                    } else {
                        update(callback);
                    }
                });
            });
        });
    };

    var start = function start(callback) {
        started = true;
        stopped = false;
        update(callback);
    };

    var stop = function stop() {
        stopped = true;
    };

    return {
        setData: function setData(inputData) {
            input = formatInputData(inputData);
            inputIndex = 0;

            var series = deepCopy(baseSeries);
            series[0].data = input[inputIndex].values;
            series[0].dataLabels.formatter = formatter;

            var options = deepCopy(baseOptions);
            if (input[inputIndex].options) {
                options = merge(options, input[inputIndex].options);
            }
            options.series = series;
            options.xAxis.categories = input[inputIndex].categories;

            chart = Highcharts.chart(selector, options);
        },
        update: update,
        start: start,
        stop: stop
    };
};