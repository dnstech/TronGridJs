TronGridJs
==========

A virtualized JavaScript grid layout system with support for non-uniform row heights and column widths.


How to use
==========
TronGrid is designed to work as a knockout binding (although could very easily be used without KnockoutJs)

1. In your html file add a div
    <div data-bind="tronGrid: myGridOptions"></div>
    
2. In your ViewModel add a Grid Options object that defines the behaviour of the Grid:
   class MainViewModel {
      myGridOptions: TronGrid.IOptions = {
            dataProvider: new SampleDataProvider(),
            rowsPerBlock: 10,
            columnsPerBlock: 3
        }
  }

