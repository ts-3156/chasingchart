# Chasingchart

Bars chase other bars. [Live demo](https://ts-3156.github.io/chasingchart/src/index.html)

## Demo

| Gross Domestic Product (GDP) | The number of tourists to Japan |
:----: | :----:
| [Edit in JSFiddle](https://jsfiddle.net/Shinohara/s0nbcq8p/12/) | [Edit in JSFiddle](https://jsfiddle.net/Shinohara/5tvLcpxu/13/) |
| ![Gross Domestic Product (GDP)](https://github.com/ts-3156/chasingchart/blob/master/media/gdp.gif) | ![The number of tourists to Japan](https://github.com/ts-3156/chasingchart/blob/master/media/tourists.gif) |


## Getting Started

```html
<script src="https://code.highcharts.com/highcharts.js"></script>
<script src="https://ts-3156.github.io/chasingchart/chasingchart-latest.js"></script>

<div id="container" style="min-width: 310px; max-width: 800px; height: 400px; margin: 0 auto"></div>
<button id="button">Start</button>

<script>
    var input = [...];

    var chart = Chasingchart.chart('container');
    chart.setData(input);

    document.getElementById('button').addEventListener("click", function (event) {
        chart.start();
    }, false);
</script>
```

## Input data format

[Demo using the below data](https://jsfiddle.net/Shinohara/pxcawzhr/13/)

```json
[{
    "data": {"cat1":  500, "cat2":  400, "cat3":  300, "cat4":  200, "cat5":  100},
    "options": {"title": {"text": "Something statistics"}, "subtitle": {"text": "1900"}}
}, {
    "data": {"cat1":  500, "cat2":  550, "cat3":  300, "cat4":  200, "cat5":  100},
    "options": {"title": {"text": "Something statistics"}, "subtitle": {"text": "2000"}}
}]
```

## Contributing

Anything is OK. Feel free to submit issues or pull-requests.

- [Issues](https://github.com/ts-3156/chasingchart/issues)
- [Pull-requests](https://github.com/ts-3156/chasingchart/pulls)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/ts-3156/chasingchart/blob/master/LICENSE) file for details

## Acknowledgments

- [Thanks ppotaczek](https://stackoverflow.com/questions/53935813/highcharts-can-i-animate-changing-the-order-of-bars-on-bar-chart)
- [Inspired by The Major World Economies Over Time](https://www.reddit.com/r/interestingasfuck/comments/9togwf/the_major_world_economies_over_time/)
- [Button design](https://labs.loupbrun.ca/buttons/)
