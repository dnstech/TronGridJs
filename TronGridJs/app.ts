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

ko.applyBindings(new MainViewModel());
