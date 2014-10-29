/// <reference path="trongrid.ts" />
var MainViewModel = (function () {
    function MainViewModel() {
        this.log = ko.observableArray([]);
        this.lastUpdated = ko.observable('');
        this.options = {
            dataProvider: new SampleChartDataProvider(),
            dataPresenter: new SampleCanvasPresenter(),
            rowsPerBlock: 1,
            columnsPerBlock: 5
        };
    }
    MainViewModel.prototype.changeData = function () {
        var _this = this;
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(function () {
            var d = new Date();
            _this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            _this.options.dataProvider.dataChanged();
        }, 500);
    };
    return MainViewModel;
})();

var SampleChartDataProvider = (function () {
    function SampleChartDataProvider() {
        this.rowCount = 100;
        this.columnCount = 10000;
    }
    SampleChartDataProvider.prototype.rowHeight = function (r) {
        return 200;
    };

    SampleChartDataProvider.prototype.columnWidth = function (c) {
        return 100;
    };

    SampleChartDataProvider.prototype.cellData = function (r, c) {
        var d = new Date();
        return d.getMilliseconds();
    };
    return SampleChartDataProvider;
})();

var SampleCanvasPresenter = (function () {
    function SampleCanvasPresenter() {
    }
    SampleCanvasPresenter.prototype.createCell = function (row, column) {
        return document.createElement('canvas');
    };

    SampleCanvasPresenter.prototype.renderCell = function (cell, data, row, column) {
        var context = cell.getContext("2d");
        var h = (data / 5);
        context.clearRect(0, 0, cell.width, cell.height);
        context.beginPath();
        context.rect(5, cell.height - h, cell.width - 10, h);
        context.fillStyle = '#ccc';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'white';
        context.stroke();
    };
    return SampleCanvasPresenter;
})();

var SampleDataProvider = (function () {
    function SampleDataProvider() {
        this.rowCount = 1000;
        this.columnCount = 100;
    }
    SampleDataProvider.prototype.cellData = function (r, c) {
        var d = new Date();
        return '[' + r + ',' + c + '] ' + d.getMinutes() + ':' + d.getSeconds();
    };

    SampleDataProvider.prototype.rowHeight = function (r) {
        return new Date().getSeconds() % 2 === 0 ? 50 : 25;
    };

    SampleDataProvider.prototype.columnWidth = function (c) {
        return 100;
    };
    return SampleDataProvider;
})();

ko.applyBindings(new MainViewModel());
//# sourceMappingURL=app.js.map
