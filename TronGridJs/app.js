/// <reference path="trongrid.ts" />
var MainViewModel = (function () {
    function MainViewModel() {
        this.options = {
            dataProvider: new SampleDataProvider(),
            rowsPerBlock: 10,
            columnsPerBlock: 3
        };
        this.lastUpdated = ko.observable('');
    }
    MainViewModel.prototype.changeData = function () {
        var _this = this;
        setInterval(function () {
            var d = new Date();
            _this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            _this.options.dataProvider.dataChanged();
        }, 500);
    };
    return MainViewModel;
})();

var SampleDataProvider = (function () {
    function SampleDataProvider() {
        this.rowCount = 1000;
        this.columnCount = 1000;
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
