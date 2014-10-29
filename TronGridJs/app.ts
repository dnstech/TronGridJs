/// <reference path="trongrid.ts" />

class MainViewModel {
    options: TronGrid.IOptions = {
        dataProvider: new SampleDataProvider(),
        rowsPerBlock: 10,
        columnsPerBlock: 3
    }

    timer: any;

    lastUpdated = ko.observable('');

    changeData() {
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(() => {
            var d = new Date();
            this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            this.options.dataProvider.dataChanged();
        }, 500);
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
        return new Date().getSeconds() % 2 === 0 ? 50 : 25;
    }

    columnWidth(c) {
        return 100;
    }

    dataChanged: () => void;
}

ko.applyBindings(new MainViewModel());
