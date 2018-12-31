/*
 Chasingchart JS v1.0.0 (2018-12-30)

 (c) 2018 Teruki Shinohara

 License: github.com/ts-3156/chasingchart/blob/master/LICENSE
*/
const Chasingchart = {};

Chasingchart.chart = function (_selector, _options) {
    let input = null;
    let inputIndex = 0;
    let chart = null;
    let started = false;
    let stopped = false;
    const duration = (_options && _options.duration) || 750;
    const selector = _selector;
    const COLORS = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075"];

    const formatter = function () {
        // return Highcharts.numberFormat(this.y, 0, '', ',');
        let v = this.y;
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

    const deepCopy = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    // TODO Avoid using lodash
    const merge = function (src1, src2) {
        // return Object.assign(deepCopy(src1), deepCopy(src2));
        return _.merge(deepCopy(src1), deepCopy(src2));
    };

    const baseSeries = [{
        name: 'Series 1',
        animation: {duration: duration},
        data: []
    }];

    const baseOptions = {
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

    const formatInputData = function (input) {
        const colors = {};
        input[0].categories.forEach(function (category, i) {
            colors[category] = COLORS[i % COLORS.length];
        });

        const sortedInput = [];

        input.forEach(function (elem, i) {
            const ary = [];
            elem.values.forEach(function (value, j) {
                ary[j] = {value: value, category: elem.categories[j]}
            });

            ary.sort(function (a, b) {
                return b.value - a.value;
            });

            const sortedElem = {values: [], categories: []};
            ary.forEach(function (obj, i) {
                sortedElem.values[i] = {y: obj.value, color: colors[obj.category]};
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

    const countUp = function (duration, animation, startedCallback, finishedCallback) {
        const maxLoopCount = 24;
        const interval = duration / maxLoopCount;
        let loopCount = 0;

        const values = [];
        chart.series[0].data.forEach(function (d, i) {
            values[i] = d.y; // Sorted by value
        });

        const nextValues = [];
        chart.xAxis[0].categories.forEach(function (c, i) {
            input[inputIndex].categories.forEach(function (cc, j) {
                if (c === cc) {
                    nextValues[i] = input[inputIndex].values[j].y; // Sorted by current value
                }
            });
        });

        if (!animation) {
            chart.series[0].setData(nextValues, true, {duration: duration});
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

        const animate = function () {
            const tmpValues = [];
            values.forEach(function (v, i) {
                if (loopCount >= maxLoopCount - 1) {
                    tmpValues[i] = nextValues[i];
                } else {
                    if (v === nextValues[i]) {
                        tmpValues[i] = v;
                    } else {
                        const diff = parseFloat(loopCount + 1) * Math.abs(v - nextValues[i]) / maxLoopCount;
                        if (v < nextValues[i]) {
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
                if (finishedCallback) {
                    finishedCallback();
                }
            }
        };

        animate();
        const timer = setInterval(animate, interval);

        if (startedCallback) {
            startedCallback();
        }
    };

    const rotateBars = function (duration, callback) {
        const points = chart.series[0].points;
        const ticks = chart.xAxis[0].ticks;

        const values = [];
        const categories = chart.xAxis[0].categories;
        chart.series[0].data.forEach(function (d, i) {
            values[i] = {value: d.y, category: categories[i]}; // Sorted by value
        });


        const sortedValues = [];
        chart.xAxis[0].categories.forEach(function (c, i) {
            input[inputIndex].categories.forEach(function (cc, j) {
                if (c === cc) {
                    sortedValues[i] = {value: input[inputIndex].values[j].y, category: c}; // Sorted by current value
                }
            });
        });

        sortedValues.sort(function (a, b) {
            return b.value - a.value;
        });

        // TODO Don't call rotateBars right after calling countUp.
        //  Because chart.series[0].setData overwrite the positions of bars.

        let isChanged = false;
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

    const reDraw = function (series, categories, options, callback) {
        options.xAxis.categories = categories;
        options.series = series;

        chart.destroy();
        chart = Highcharts.chart(selector, options);

        if (callback) {
            callback();
        }
    };

    const update = function (callback) {
        if (input.length - 1 <= inputIndex) {
            started = false;
            if (callback) {
                callback();
            }
            return;
        }
        inputIndex++;

        const nextSeries = deepCopy(baseSeries);
        nextSeries[0].data = input[inputIndex].values;

        let options = deepCopy(baseOptions);
        if (input[inputIndex].options) {
            options = merge(options, input[inputIndex].options);
        }
        options.plotOptions.series.dataLabels.formatter = formatter;

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

    const start = function (callback) {
        started = true;
        stopped = false;
        update(callback);
    };

    const stop = function () {
        stopped = true;
    };

    return {
        setData: function (inputData) {
            input = formatInputData(inputData);
            inputIndex = 0;

            const series = deepCopy(baseSeries);
            series[0].data = input[inputIndex].values;

            let options = deepCopy(baseOptions);
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
