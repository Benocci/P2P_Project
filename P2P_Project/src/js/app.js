var gameId = null;
var gameAmount = null;
var boardSize = null;
var board = null;
var shipNumber = null;

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

  bindEvents: async function () {
    $(document).on('click', '#createNewGameBtn', App.createNewGame);
    $(document).on('click', '#joinRandomGameBtn', App.joinRandomGame);
    $(document).on('click', '#joinGameBtn', App.joinSpecificGame);
    $(document).on('click', '#backToMenu', App.backToMainMenu);

    $(document).on('input', "#boardSize", (event) => boardSize = event.target.value);
    $(document).on('input', "#shipNumber", (event) => shipNumber = event.target.value);
    $(document).on('input', "#ethAmmount", (event) => gameAmount = event.target.value);

    $(document).on('click', '#createGame', App.gameCreation);

    $(document).on('click', '#joinGameIdBtn', App.joinGame);
  },

  backToMainMenu: function () {
    $('#createOrJoin').show();
    $('#setUpNewGame').hide();
    $('#joinSpecificGame').hide();
  },

  createNewGame: function () {
    $('#setUpNewGame').show();
    $('#createOrJoin').hide();
  },

  joinRandomGame: function () {
    alert("You choose to join a random game!");
  },

  joinSpecificGame: function () {
    $('#joinSpecificGame').show();
    $('#createOrJoin').hide();
  },

  gameCreation: function () {

    if (!boardSize || !shipNumber || !gameAmount) {
      alert("You have to insert all the value to continue!");
    }
    else {
      if (boardSize % 2 != 0 || boardSize <= 0) {
        alert("The board size have to be a positive number multilpe of 2!");
        return;
      }
      if (shipNumber <= 0) {
        alert("The number of ships have to be a positive number!");
        return;
      }


      App.contracts.BattleShipGame.deployed().then(async function (instance) {
        newInstance = instance
        return newInstance.createGame(boardSize, shipNumber);
      }).then(async function (logArray) {
        gameId = logArray.logs[0].args._gameId.toNumber();
        if (gameId < 0) {
          console.error("Something went wrong, game id is negative!");
        }
        else {
          $('#setUpNewGame').hide();
          $('#gameBoardDiv').show();
          $('#gameBoardConnection').text("Waiting for an opponents! The Game ID is " + gameId + "!");
        }
      }).catch(function (err) {
        console.error(err);
      });
    }

    alert("Creation of a board of size " + boardSize + " with " + shipNumber + " ships and amount of ETH equal to " + gameAmount);
  },

  joinGame: function () {
    var selectedGameId = $('#selectedGameId').val();

    if(selectedGameId == 0){
      alert("You have to insert a game ID grather than zero!");
      return;
    }

    if (!selectedGameId) {
      alert("You have to insert a game ID!");
    }
    else {
      alert("You insert the game ID: " + selectedGameId);

      App.contracts.BattleShipGame.deployed().then(async function (instance) {
        newInstance = instance
        return newInstance.joinGame(selectedGameId);
      }).then(async function (logArray) {
        alert("You joined the game, the amount of ETH was set to ");
        gameId = logArray.logs[0].args._gameId.toNumber();
        //gameAmount = logArray.logs[0].args.;
        boardSize = logArray.logs[0].args._boardSize.toNumber();
        shipNumber = logArray.logs[0].args._shipNum.toNumber();
      }).catch(function (err) {
        console.error(err);
      });
    }
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});