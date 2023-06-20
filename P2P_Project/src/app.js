var gameId = null;
var gameAmount = null;
var boardSize = null;
var board = null;
var shipNumber = null;

App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    return await App.bindEvents();
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
    return App.initContract();
  },

  initContract: function () {

  },

  bindEvents: async function () {
    $(document).on('click', '#createNewGameBtn', App.createNewGame);
    $(document).on('click', '#joinRandomGameBtn', App.joinRandomGame);
    $(document).on('click', '#joinGameBtn', App.joinGame);
  },

  createNewGame: function () {
    $('#setUpNewGame').show();
    $('#createOrJoin').hide();
  },

  joinRandomGame: function () {
    alert("You choose to join a random game!");
  },

  joinGame: function () {
    var selectedGameId = $('#selectedGameId').val();

    if(!selectedGameId) {
      alert("You have to insert a game ID!");
    }
    else{
      alert("You insert the game ID: " + selectedGameId);
    }
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});