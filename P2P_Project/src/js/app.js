var gameId = null;
var ethAmmount = null;
var boardSize = null;
var board = null;
var shipNumber = null;
var shipPlaced = null;
var myBoardMatrix = null;
var opponentBoardMatrix = null;

App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();		// Request account access
      } catch (error) {
        console.error("User denied account access");	// User was denied account access
      }
    }
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    else {
      App.web3Provider = new Web3.provider.HttpProvider("http://localhost:7545");
    }
    web3 = new Web3(App.web3Provider);
    web3.eth.defaultAccount = web3.eth.accounts[0];
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("BattleShipGame.json", function (data) {
      var BattleShipGameArtifact = data;
      App.contracts.BattleShipGame = TruffleContract(BattleShipGameArtifact);
      App.contracts.BattleShipGame.setProvider(App.web3Provider);
    });

    return App.bindEvents();
  },

  bindEvents: async function () { //function with all the function linked with the button of HTML 
    // button to start the game creation:
    $(document).on('click', '#createNewGameBtn', App.createNewGame);
    // buttons to join a game:
    $(document).on('click', '#joinRandomGameBtn', App.joinGame);
    $(document).on('click', '#joinGameBtn', App.joinSpecificGame);

    // button to back to main menu:
    $(document).on('click', '#backToMenuBtn', App.backToMainMenu);
    // button to create a new game:
    $(document).on('click', '#createGameBtn', App.gameCreation);
    // button to accept the Ethereum amount
    $(document).on('click', '#acceptAmountBtn', App.acceptEthAmount);
    // button to refuse the Ethereum amount
    $(document).on('click', '#refuseAmountBtn', App.refuseEthAmount);
  },

  backToMainMenu: function () { // function for back to the menu
    $('#createOrJoin').show();
    $('#setUpNewGame').hide();
    $('#joinSpecificGame').hide();
    $('#waitingOpponent').hide();
    $('#acceptAmount').hide();
    $('#gameBoard').hide();
  },

  createNewGame: function () { // function to show the create game menu
    $('#setUpNewGame').show();
    $('#createOrJoin').hide();
  },

  joinSpecificGame: function () { // function to show the join a speciic game menu
    $('#joinSpecificGame').show();
    $('#createOrJoin').hide();
    $(document).on('click', '#joinGameIdBtn', App.joinGame);
  },

  gameCreation: function () { // function to handle a game creation
    boardSize = $('#boardSize').val();
    shipNumber = $('#shipNumber').val();
    ethAmmount = $('#ethAmmount').val();

    if (!boardSize || !shipNumber || !ethAmmount) { // check on the input value
      alert("You have to insert all the value to continue!");
    }
    else {
      if (boardSize % 2 != 0 || boardSize <= 0) { // size of the board is a positive number muliple of 2
        alert("The board size have to be a positive number multilpe of 2!");
        return;
      }
      if (shipNumber <= 0) { // number of the ship > 0
        alert("The number of ships have to be a positive number!");
        return;
      }


      App.contracts.BattleShipGame.deployed().then(async function (instance) {
        newInstance = instance
        return newInstance.createGame(boardSize, shipNumber, ethAmmount);
      }).then(async function (logArray) { // callback to the contract function createGame
        gameId = logArray.logs[0].args._gameId.toNumber(); // get the gameId from the event emitted in the contract
        if (gameId < 0) {
          console.error("Something went wrong, game id is negative!");
        }
        else {
          // waiting room:
          $('#setUpNewGame').hide();
          $('#waitingOpponent').show();
          $('#waitingOpponentConnection').text("Creation of a board of size " + boardSize + " with " + shipNumber + " ships and amount of ETH equal to " + ethAmmount + ".\n" +
            "Waiting for an opponents! The Game ID is " + gameId + "!");
          App.setBoard();
        }
      }).catch(function (err) {
        console.error(err);
      });
    }
  },

  joinGame: function () { // function to handle a join game
    var selectedGameId = $('#selectedGameId').val();

    if (!selectedGameId) { // check on the gameId
      selectedGameId = 0;
      $('#setUpNewGame').hide();
    }

    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.joinGame(selectedGameId);
    }).then(async function (logArray) { // callback to the contract function joinGame
      // get all the value from the event emitted in the smart contract:
      gameId = logArray.logs[0].args._gameId.toNumber();
      ethAmmount = logArray.logs[0].args._ethAmount.toNumber();
      boardSize = logArray.logs[0].args._boardSize.toNumber();
      shipNumber = logArray.logs[0].args._shipNum.toNumber();

      App.showAcceptEthAmount();
    }).catch(function (err) {
      console.error(err);
    });
  },

  showAcceptEthAmount: function () {
    $('#joinSpecificGame').hide();
    $('#acceptAmountText').text("To start the game you have to bet this amount of Ethereum: " + ethAmmount + ".")
    $('#acceptAmount').show();
  },

  acceptEthAmount: function () {
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, true);
    }).then(async function (logArray) {
      App.setBoard();
    }).catch(function (err) {
      console.error(err);
    });
  },

  refuseEthAmount: function () {
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, false);
    }).then(async function (logArray) {
      App.backToMainMenu();
    }).catch(function (err) {
      console.error(err);
    });
  },

  setBoard: async function () {
    await newInstance.allEvents(
      (err, events) => {
        if (events.event == "AmountEthResponse" && events.args._gameId.toNumber() == gameId) {
          $('#posFase').show();
          $('#acceptAmount').hide();
          $('#waitingOpponent').hide();

          shipPlaced = 0;
          myBoardMatrix = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
          App.createBoardTable();
          //alert("DEBUG: Creazione board piazzamento");
        }
        else if (events.event == "SubmitBoard" && events.args._gameId.toNumber() == gameId) {
          opponentBoardMatrix = events.args._gameBoard;

          App.startBattleFase();
          alert("DEBUG: Creazione board battaglia");
        }

      });
  },

  createBoardTable: function () {
    const board = document.getElementById('gameBoard');
    board.style = "grid-template-columns: 40px repeat(" + boardSize + ", 1fr);grid-template-rows: 40px repeat(" + boardSize + ", 1fr);"

    for (let j = 0; j <= boardSize; j++) {
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      if (j > 0) {
        headerCell.textContent = String.fromCharCode(64 + j);
      }
      board.appendChild(headerCell);
    }

    for (let i = 0; i < boardSize; i++) {
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      headerCell.textContent = i + 1;

      board.appendChild(headerCell);

      for (let j = 0; j < boardSize; j++) {
        const cell = document.createElement("div");
        cell.classList.add("my-cell");
        cell.dataset.row = i;
        cell.dataset.col = j;
        cell.addEventListener("click", (event) => App.placeShip(event));
        board.appendChild(cell);
      }
    }
  },

  placeShip: function (event) {
    const cellRow = event.target.dataset.row;
    const cellCol = event.target.dataset.col;
    const cell = document.querySelector(
      `div.my-cell[data-row='${cellRow}'][data-col='${cellCol}']`
    );

    if (shipPlaced == shipNumber && myBoardMatrix[cell.dataset.row][cell.dataset.col] === 0) {
      return;
    }

    if (myBoardMatrix[cell.dataset.row][cell.dataset.col] === 0) {
      // Inserisci la nave nella posizione
      cell.classList.add('ship');
      $('#messageInfo').text("Nave posizionata!");
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 1;
      shipPlaced++;
      alert("DEBUG: AGGIUNGO NAVE, Nave numero " + shipPlaced + " su " + shipNumber);
    } else {
      // Rimuovi la nave se è già presente nella posizione
      cell.classList.remove('ship');
      $('#messageInfo').text("Nave rimossa!");
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 0;
      shipPlaced--;
      alert("DEBUG: RIMUOVO NAVE, Nave numero " + shipPlaced + " su " + shipNumber);
    }

    if (shipPlaced == shipNumber) {
      $('#messageInfo').text("Tutte le navi inserite!");
      const submit = document.getElementById('submitBtn');
      submit.addEventListener("click", () => App.submitBoard());
    }
  },

  submitBoard: function () {
    if(shipPlaced != shipNumber){
      alert("Please place " + shipNumber + " ship!");
      return;
    }

    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.submitBoard(gameId, myBoardMatrix);
    }).then(async function (logArray) {
      $('#posFase').hide();
    }).catch(function (err) {
      console.error(err);
    });
  },

  startBattleFase: function () {
    $('battleFase').show();
    const board = document.getElementById('battleGameBoard');
    board.style = "grid-template-columns: 40px repeat(" + boardSize + ", 1fr);grid-template-rows: 40px repeat(" + boardSize + ", 1fr);"

    for (let j = 0; j <= boardSize; j++) {
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      if (j > 0) {
        headerCell.textContent = String.fromCharCode(64 + j);
      }
      board.appendChild(headerCell);
    }

    for (let i = 0; i < boardSize; i++) {
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      headerCell.textContent = i + 1;

      board.appendChild(headerCell);

      for (let j = 0; j < boardSize; j++) {
        const cell = document.createElement("div");
        cell.classList.add("opponent-cell");
        cell.dataset.row = i;
        cell.dataset.col = j;
        cell.addEventListener("click", (event) => App.handleCellClick(event));
        board.appendChild(cell);
      }
    }
  },

  handleCellClick: function (event) {
    const cellRow = event.target.dataset.row;
    const cellCol = event.target.dataset.col;
    const cell = document.querySelector(
      `div.opponent-cell[data-row='${cellRow}'][data-col='${cellCol}']`
    );
    const battleInfo = document.getElementById('battleInfo');

    if (boardMatrix[cellRow][cellCol] === 0) {
      cell.innerHTML = "✖";
      battleInfo.classList.remove("hit");
      battleInfo.textContent = "Missed shot.";
    } else if (boardMatrix[cellRow][cellCol] !== 0) {
      cell.innerHTML = '💥'
      battleInfo.textContent = "Shot hit!";
    }
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});