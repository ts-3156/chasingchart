/*
 Chasingchart JS v1.4.1 (2019-01-03)

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
    var COLORS = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075"];

    var formatter = function formatter(value) {
        // return Highcharts.numberFormat(this.y, 0, '', ',');
        var v = void 0;
        if (value === 0) {
            v = 0;
        } else {
            v = typeof value === 'number' && value || this.y;
        }

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
        data: []
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
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    align: 'right',
                    formatter: formatter
                }
            }
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
        var colors = {};
        Object.keys(input[0].data).forEach(function (category, i) {
            colors[category] = COLORS[i % COLORS.length];
        });

        var sortedInput = [];

        input.forEach(function (elem, i) {
            var ary = [];
            Object.keys(elem.data).forEach(function (category, i) {
                ary.push({ value: elem.data[category], category: category });
            });

            ary.sort(function (a, b) {
                return b.value - a.value;
            });

            var sortedElem = { values: [], categories: [] };
            ary.forEach(function (obj, i) {
                sortedElem.values[i] = { y: obj.value, color: colors[obj.category] };
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

    var countUp = function countUp(duration, startedCallback, finishedCallback) {
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

        chart.series[0].setData(nextValues, true, { duration: duration });
        if (startedCallback) {
            startedCallback();
        }

        var counter = 0;
        var maxSteps = 10;

        var updateDataLabels = function updateDataLabels() {
            chart.series[0].points.forEach(function (point, i) {
                var actualValue = void 0;
                if (counter === maxSteps) {
                    actualValue = nextValues[i];
                } else {
                    if (values[i] === nextValues[i]) {
                        actualValue = nextValues[i];
                    } else {
                        var diff = parseFloat(counter + 1) * Math.abs(nextValues[i] - values[i]) / maxSteps;
                        if (values[i] < nextValues[i]) {
                            actualValue = values[i] + diff;
                        } else {
                            actualValue = values[i] - diff;
                        }
                    }
                }
                point.dataLabel.attr({
                    text: formatter(actualValue)
                });
            });
        };

        updateDataLabels();
        counter++;

        var timer = setInterval(function () {
            updateDataLabels();
            counter++;
            if (counter >= maxSteps) {
                clearInterval(timer);
                if (finishedCallback) {
                    finishedCallback();
                }
            }
        }, duration / maxSteps);
    };

    var rotateBars = function rotateBars(duration, callback) {
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

        var points = chart.series[0].points;
        var ticks = chart.xAxis[0].ticks;

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

        var options = deepCopy(baseOptions);
        if (input[inputIndex].options) {
            options = merge(options, input[inputIndex].options);
        }
        options.plotOptions.series.dataLabels.formatter = formatter;

        countUp(duration, function () {
            rotateBars(Math.floor(duration * 0.8), function () {});
        }, function () {
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

            var options = deepCopy(baseOptions);
            if (input[inputIndex].options) {
                options = merge(options, input[inputIndex].options);
            }
            options.plotOptions.series.dataLabels.formatter = formatter;
            options.series = series;
            options.xAxis.categories = input[inputIndex].categories;

            chart = Highcharts.chart(selector, options);
        },
        update: update,
        start: start,
        stop: stop
    };
};