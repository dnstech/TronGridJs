/// <reference path="trongrid.ts" />

class MainViewModel {
    dataOnRows = ko.observableArray<RowViewModel>();
    dataOnColumns = ko.observableArray<ColumnViewModel>();
}

class ColumnViewModel {
    title = ko.observable('');
    cells = ko.observableArray<CellViewModel>();
}

class RowViewModel {
    cells = ko.observableArray<CellViewModel>();
}

class CellViewModel {
    text = ko.observable('');
}

window.onload = () => {
    var template = document.getElementById('template');
    var el = document.getElementById('content');
    var greeter = new TronGrid(el);
    greeter.start();
};