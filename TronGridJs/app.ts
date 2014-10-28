/// <reference path="trongrid.ts" />

class MainViewModel {
    options: TronGrid.IOptions = {
        dataProvider: new SampleDataProvider()
    }
}

class SampleDataProvider implements TronGrid.IDataProvider {
    rowCount = 1000;
    columnCount = 1000;
    cellData(r, c) {
        var d = new Date();
        return '[' + r + ',' + c + '] ' + d.getMinutes() + ':' + d.getSeconds();
    }

    rowHeight(r) {
        return 50;
    }

    columnWidth(c) {
        return 50;
    }

    dataChanged: () => void;
}

ko.applyBindings(new MainViewModel());
