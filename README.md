# Chasingchart

Bars chase other bars.

## Demo

| Gross Domestic Product (GDP) | The number of tourists to Japan |
---- | ----
| ![Gross Domestic Product (GDP)](https://github.com/ts-3156/chasingchart/blob/master/media/gdp.gif) | ![The number of tourists to Japan](https://github.com/ts-3156/chasingchart/blob/master/media/tourists.gif) |


## Getting Started

```html
<script src="https://code.highcharts.com/highcharts.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.11/lodash.min.js"></script>
<script src="./main.js"></script>

<div id="container" style="min-width: 310px; max-width: 800px; height: 400px; margin: 0 auto"></div>
<button id="button">Start</button>

<script>
    var input = [...];

    var chart = Chasingchart.chart('container');
    chart.setData(input);

    document.getElementById('button').addEventListener("click", function (event) {
        chart.update();
    }, false);
</script>
```

## Input data format

```json
[{
    "values": [500, 400, 300, 200, 100],
    "categories": ["Cat1", "Cat2", "Cat3", "Cat4", "Cat5"],
    "options": {"title": {"text": "Something statistics"}, "subtitle": {"text": "1900"}}
}, {
    "values": [550, 500, 300, 400, 500],
    "categories": ["Cat2", "Cat1", "Cat3", "Cat4", "Cat5"],
    "options": {"title": {"text": "Something statistics"}, "subtitle": {"text": "2000"}}
}]
```

## Contributing

Everyone is encouraged to help improve this project. Here are a few ways you can help:

- [Report bugs](https://github.com/ts-3156/chasingchart/issues)
- Fix bugs and [submit pull requests](https://github.com/ts-3156/chasingchart/pulls)
- Write, clarify, or fix documentation
- Suggest or add new features
