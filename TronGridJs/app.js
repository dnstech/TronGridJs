/// <reference path="trongrid.ts" />
/// <reference path="ko-trongrid.ts" />
var MainViewModel = (function () {
    function MainViewModel() {
        this.log = ko.observableArray([]);
        this.lastUpdated = ko.observable('');
        this.textOptions = {
            dataProvider: new SampleDataProvider(),
            dataPresenter: new TronGrid.TextPresenter()
        };
        this.canvasOptions = {
            dataProvider: new SampleChartDataProvider(),
            dataPresenter: new SampleCanvasPresenter()
        };
    }
    MainViewModel.prototype.changeTextData = function () {
        var _this = this;
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(function () {
            var d = new Date();
            _this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            _this.textOptions.dataProvider.dataChanged({});
        }, 500);
    };

    MainViewModel.prototype.scrollTo = function () {
        this.textOptions.dataProvider.scrollIntoView({
            firstColumn: 10,
            firstRow: 10,
            lastColumn: 20,
            lastRow: 20
        });
    };

    MainViewModel.prototype.scrollToAnimated = function () {
        this.textOptions.dataProvider.scrollIntoView({
            firstColumn: 40,
            firstRow: 40,
            lastColumn: 60,
            lastRow: 60,
            duration: 2000
        });
    };

    MainViewModel.prototype.changeCanvasData = function () {
        var _this = this;
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(function () {
            var d = new Date();
            _this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            _this.canvasOptions.dataProvider.dataChanged({});
        }, 500);
    };
    return MainViewModel;
})();

var SampleChartDataProvider = (function () {
    function SampleChartDataProvider() {
        this.rowCount = 100;
        this.columnCount = 10000;
        this.rowsPerBlock = 2;
        this.columnsPerBlock = 5;
        this.dataChanged = ko.observable();
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
        this.pixelRatio = (function () {
            var ctx = document.createElement("canvas").getContext("2d"), dpr = window.devicePixelRatio || 1, bsr = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;

            return dpr / bsr;
        })();
    }
    SampleCanvasPresenter.prototype.createHiDPICanvas = function (w, h, ratio) {
        if (!ratio) {
            ratio = this.pixelRatio;
        }

        var can = document.createElement("canvas");
        can.width = w * ratio;
        can.height = h * ratio;
        can.style.width = w + "px";
        can.style.height = h + "px";
        can.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        return can;
    };

    SampleCanvasPresenter.prototype.createCell = function (row, column, size) {
        return this.createHiDPICanvas(size.width, size.height);
    };

    SampleCanvasPresenter.prototype.renderCell = function (cell, data, row, column, size) {
        var context = cell.getContext("2d");
        var h = (data / 5);
        context.clearRect(0, 0, size.width, size.height);
        context.beginPath();
        context.rect(5, size.height - h, size.width - 10, h);
        context.fillStyle = '#ccc';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'white';
        context.stroke();
        context.font = '18pt Calibri';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('R: ' + row + ' C: ' + column, size.width / 2, size.height - 50, size.width - 10);
        context.fillText('T: ' + data, size.width / 2, size.height - 30, size.width - 10);
    };
    return SampleCanvasPresenter;
})();

var SampleDataProvider = (function () {
    function SampleDataProvider() {
        this.rowCount = 1000;
        this.columnCount = 100;
        this.rowsPerBlock = 10;
        this.columnsPerBlock = 20;
        this.scrollIntoView = ko.observable();
        this.dataChanged = ko.observable(null);
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
