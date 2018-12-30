var Chasingchart = {};

Chasingchart.chart = function (_selector, _options) {
    var input = null;
    var inputIndex = 0;
    var chart = null;
    var duration = (_options && _options.duration) || 750;
    var selector = _selector;

    var formatter = function () {
        // return Highcharts.numberFormat(this.y, 0, '', ',');
        var v = this.y;
        if (v > 1000000000) {
            v = Math.floor(v / 1000000000) + "G";
        } else if (v > 1000000) {
            v = Math.floor(v / 1000000) + "M";
        } else if (v > 1000) {
            v = Math.floor(v / 1000) + "K";
        }
        return v;
    };

    var deepCopy = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    // TODO I want to avoid using lodash.
    var merge = function (src1, src2) {
        // return Object.assign(deepCopy(src1), deepCopy(src2));
        return _.merge(deepCopy(src1), deepCopy(src2));
    };

    var baseSeries = [{
        name: 'Series 1',
        animation: {duration: duration},
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

    var formatInputData = function (input) {
        var colors = ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9", "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"];
        var assignedColors = {};

        input[0].categories.forEach(function (category, i) {
            assignedColors[category] = colors[i % colors.length];
        });

        var sortedInput = [];

        input.forEach(function (elem, i) {
            var ary = [];
            elem.values.forEach(function (value, j) {
                ary[j] = {value: value, category: elem.categories[j]}
            });

            ary.sort(function (a, b) {
                return b.value - a.value;
            });

            var sortedElem = {values: [], categories: []};
            ary.forEach(function (obj, i) {
                sortedElem.values[i] = {y: obj.value, color: assignedColors[obj.category]};
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

    var countUp = function (nextSeries, duration, animation, callback) {
        var maxLoopCount = 24;
        var interval = duration / maxLoopCount;
        var loopCount = 0;

        var values = [];
        chart.series[0].data.forEach(function (d, i) {
            values[i] = d.y;
        });

        var nextValues = [];
        chart.xAxis[0].categories.forEach(function (c, i) {
            input[inputIndex].categories.forEach(function (cc, j) {
                if (c === cc) {
                    nextValues[i] = nextSeries[0].data[j];
                }
            });
        });

        if (!animation) {
            chart.series[0].setData(nextValues, true, {duration: duration});
            // setTimeout(function () {
              callback();
            // }, duration);

            return;
        }

        var timer = setInterval(function () {
            var tmpValues = [];
            values.forEach(function (v, i) {
                if (loopCount >= maxLoopCount - 1) {
                    tmpValues[i] = nextValues[i];
                } else {
                    if (v === nextValues[i].y) {
                        tmpValues[i] = v;
                    } else {
                        var diff = parseFloat(loopCount + 1) * Math.abs(v - nextValues[i].y) / maxLoopCount;
                        if (v < nextValues[i].y) {
                            tmpValues[i] = v + diff;
                        } else {
                            tmpValues[i] = v - diff;
                        }
                    }
                }
            });

            chart.series[0].setData(tmpValues, true, {duration: interval});
            loopCount++;

            if (loopCount >= maxLoopCount) {
                clearInterval(timer);
                if (callback) {
                    // setTimeout(function () {
                      callback();
                    // }, interval);
                }
            }
        }, interval);
    };

    var rotateBars = function (duration, callback) {
        var points = chart.series[0].points;
        var ticks = chart.xAxis[0].ticks;

        var sortedPoints = points.slice();
        sortedPoints.sort(function (a, b) {
            return b.y - a.y;
        });

        points.forEach(function (point, i) {
            sortedPoints.forEach(function (sPoint, j) {
                if (point === sPoint) {
                    points[i].graphic.animate({
                        x: points[j].shapeArgs.x
                    }, {duration: duration});

                    points[i].dataLabel.animate({
                        y: points[j].dataLabel.y
                    }, {duration: duration});

                    ticks[i].label.animate({
                        y: ticks[j].label.xy.y
                    }, {duration: duration});
                }
            });
        });

        if (callback) {
            setTimeout(function () {
                callback();
            }, duration);
        }
    };

    var reDraw = function (series, categories, options, callback) {
        options.xAxis.categories = categories;
        options.series = series;

        chart.destroy();
        chart = Highcharts.chart(selector, options);

        if (callback) {
            callback();
        }
    };

    var update = function (callback) {
        if (input.length - 1 <= inputIndex) {
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

        countUp(nextSeries, duration, false, function () {
            rotateBars(Math.floor(duration * 0.8), function () {
                nextSeries[0].animation = false;
                reDraw(nextSeries, input[inputIndex].categories, options, function () {
                    update(callback);
                });
            });
        });
    };

    return {
        setData: function (inputData) {
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
        update: update
    };
};
