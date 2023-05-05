/*
 Chasingchart JS v1.5.0 (2019-01-05)

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
  const title = (_options && _options.title) || null;
  const subtitle = (_options && _options.subtitle) || null;
  const selector = _selector;
  const COLORS = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075"];

  const formatter = function (value) {
    // return Highcharts.numberFormat(this.y, 0, '', ',');
    let v;
    if (value === 0) {
      v = 0;
    } else {
      v = typeof (value) === 'number' && value || this.y;
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

  const userNameFormatter = function (value) {
    return value.value;
  }

  const deepCopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  const merge = function (src1, src2) {
    // return Object.assign(deepCopy(src1), deepCopy(src2));
    return Highcharts.merge(false, deepCopy(src1), deepCopy(src2));
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
      text: title
    },
    subtitle: {
      text: subtitle
    },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          align: 'left',
          formatter: formatter
        }
      }
    },
    xAxis: {
      categories: [],
      labels: {
        useHTML: true,
        formatter: userNameFormatter
      },
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

  // Called only once at the beginning
  const formatInputData = function (input) {
    const colors = {};
    let index = 0;
    input.forEach(function (inputData) {
      Object.keys(inputData.data).forEach(function (category, i) {
        colors[category] = COLORS[i % COLORS.length];
        index++;
      });
    });

    const sortedInput = [];

    input.forEach(function (elem, i) {
      const ary = [];
      Object.keys(elem.data).forEach(function (category) {
        ary.push({value: elem.data[category], category: category})
      });

      const sortedAry = ary.slice();
      sortedAry.sort(function (a, b) {
        return b.value - a.value;
      });

      const sortedElem = {values: [], categories: []};
      sortedAry.forEach(function (obj, i) {
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

  // Called every time the period switches
  const countUp = function (duration, startedCallback, finishedCallback) {
    const data = [];
    const categories = chart.xAxis[0].categories;

    categories.forEach(function (c, i) {
      input[inputIndex].categories.forEach(function (cc, j) {
        if (c === cc) {
          data[i] = input[inputIndex].values[j].y; // Sorted by current value
        }
      });
    });

    const oldData = [];
    chart.series[0].data.forEach(function (d, i) {
      oldData[i] = d.y; // Sorted by value
    });

    chart.series[0].setData(data, true, {duration: duration});
    if (startedCallback) {
      startedCallback();
    }

    let counter = 0;
    const maxSteps = 10;

    const update = function () {
      chart.series[0].points.forEach(function (point, i) {
        let val;
        if (counter === maxSteps) {
          val = data[i];
        } else {
          const diff = parseFloat(counter + 1) * (data[i] - oldData[i]) / maxSteps;
          val = oldData[i] + diff;
        }
        point.dataLabel.attr({text: formatter(val)});
      });
    };

    update();
    counter++;

    const timer = setInterval(function () {
      update();
      counter++;
      if (counter >= maxSteps) {
        clearInterval(timer);
        if (finishedCallback) {
          finishedCallback();
        }
      }
    }, duration / maxSteps);
  };

  // Called every time the period switches
  const rotate = function (duration, callback) {
    // TODO Don't call rotate right after calling countUp.
    //  Because chart.series[0].setData overwrite the positions of bars.

    const ticks = chart.xAxis[0].ticks;
    const points = chart.series[0].points;
    const sortedPoints = points.slice();
    sortedPoints.sort(function (a, b) {
      if (b.y !== a.y) {
        return b.y - a.y;
      } else {
        return points.indexOf(a) - points.indexOf(b); // TODO To be fixed
      }
    });

    points.forEach(function (point, i) {
      sortedPoints.forEach(function (sPoint, j) {
        if (point === sPoint && i !== j) {
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

  // Called every time the period switches
  const redraw = function (series, categories, options, callback) {
    options.xAxis.categories = categories;
    options.series = series;

    chart.destroy();
    chart = Highcharts.chart(selector, options);

    if (callback) {
      callback();
    }
  };

  // Called every time the period switches
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

    countUp(duration, function () {
      rotate(Math.floor(duration * 0.8), function () {
      });
    }, function () {
      nextSeries[0].animation = false;
      redraw(nextSeries, input[inputIndex].categories, options, function () {
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
      options.xAxis.labels.formatter = userNameFormatter;

      chart = Highcharts.chart(selector, options);
    },
    update: update,
    start: start,
    stop: stop
  };
};
