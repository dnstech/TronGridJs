/// <reference path="trongrid.ts" />

class MainViewModel {
    dataProvider = new SampleDataProvider();
}

class SampleDataProvider implements TronGrid.IDataProvider {
    rowCount = 10000;
    columnCount = 10000;
    cellData(r, c) {
        return 'cell(' + r + ',' + c + ') ' + new Date();
    }

    rowHeight(r) {
        return 50;
    }

    columnWidth(c) {
        return 50;
    }

    dataChanged: () => void;
}

window.onload = () => {
    var el = document.getElementById('content');
    ko.applyBindings(el, new MainViewModel());
};