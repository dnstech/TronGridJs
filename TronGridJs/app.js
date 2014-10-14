/// <reference path="trongrid.ts" />
var MainViewModel = (function () {
    function MainViewModel() {
        this.dataOnRows = ko.observableArray();
        this.dataOnColumns = ko.observableArray();
    }
    return MainViewModel;
})();

var ColumnViewModel = (function () {
    function ColumnViewModel() {
        this.title = ko.observable('');
        this.cells = ko.observableArray();
    }
    return ColumnViewModel;
})();

var RowViewModel = (function () {
    function RowViewModel() {
        this.cells = ko.observableArray();
    }
    return RowViewModel;
})();

var CellViewModel = (function () {
    function CellViewModel() {
        this.text = ko.observable('');
    }
    return CellViewModel;
})();

window.onload = function () {
    var template = document.getElementById('template');
    var el = document.getElementById('content');
    var greeter = new TronGrid(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map
