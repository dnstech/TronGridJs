/// <reference path="trongrid.ts" />
var MainViewModel = (function () {
    function MainViewModel() {
        this.options = {
            dataProvider: new SampleDataProvider()
        };
    }
    return MainViewModel;
})();

var SampleDataProvider = (function () {
    function SampleDataProvider() {
        this.rowCount = 1000;
        this.columnCount = 1000;
    }
    SampleDataProvider.prototype.cellData = function (r, c) {
        return 'cell(' + r + ',' + c + ') ' + new Date();
    };

    SampleDataProvider.prototype.rowHeight = function (r) {
        return 50;
    };

    SampleDataProvider.prototype.columnWidth = function (c) {
        return 50;
    };
    return SampleDataProvider;
})();

ko.applyBindings(new MainViewModel());
//# sourceMappingURL=app.js.map
