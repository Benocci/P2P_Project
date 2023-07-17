// game variables:
var gameId = null;
var ethAmmount = null;
var boardSize = null;
var board = null;
var shipNumber = null;
var shipPlaced = 0;
var myShipsHitted = 0;
// game data structures:
var merkleTree = null;
var merkleRoot = null;
var myBoardMatrix = null;
var opponentBoardMatrix = null;
// bool variable:
var gameStarted = false;
var iHostTheGame = null;
var isMyTurn = null;

const sumbitBoardFunction = () => {App.submitBoard()};

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
    // show the main menu:
    $('#createOrJoin').show();
    // hide all the remaining parts:
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

  joinSpecificGame: function () { // function to show the join a specific game menu
    $('#joinSpecificGame').show();
    $('#createOrJoin').hide();
    $(document).on('click', '#joinGameIdBtn', App.joinGame);
  },

  gameCreation: function () { // function to handle a game creation
    boardSize = $('#boardSize').val();
    shipNumber = $('#shipNumber').val();
    ethAmmount = $('#ethAmmount').val();
    iHostTheGame = true;

    if (!boardSize || !shipNumber || !ethAmmount) { // check on the input value
      alert("You have to insert all the value to continue!");
    }
    else {
      if (Math.log2(boardSize) % 1 != 0 || boardSize <= 0) { // size of the board is a positive number muliple of 2
        alert("The board size have to be a positive number power of 2!");
        return;
      }
      if (shipNumber <= 0) { // number of the ship > 0
        alert("The number of ships have to be a positive number!");
        return;
      }
      if (shipNumber > (boardSize * boardSize) / 2) {
        alert("The number of ships have to be less than half of the total number of cells!");
        return;
      }

      // call to the contract
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
          document.getElementById('waitingOpponentConnection').innerHTML = "<h2>Creation of a board of size " + boardSize + " with " + shipNumber + " ships.</h2><h2>The amount of ETH is equal to " + ethAmmount + ".</h2>" +
            "<h2>Waiting for an opponents! The Game ID is " + gameId + "!</h2>";

          // board matrix initialization
          myBoardMatrix = [];
          opponentBoardMatrix = [];

          for (var i = 0; i < boardSize; i++) {
            myBoardMatrix[i] = [];
            opponentBoardMatrix[i] = [];
            for (var j = 0; j < boardSize; j++) {
              myBoardMatrix[i][j] = 0;
              opponentBoardMatrix[i][j] = 0;
            }
          }

          // waiting for the opponent:
          App.handleEvents();
        }
      }).catch(function (err) {
        //alert("ERROR: " + err.message);
        console.log(err.message);
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

      // board matrix initialization
      myBoardMatrix = [];
      opponentBoardMatrix = [];

      for (var i = 0; i < boardSize; i++) {
        myBoardMatrix[i] = [];
        opponentBoardMatrix[i] = [];
        for (var j = 0; j < boardSize; j++) {
          myBoardMatrix[i][j] = 0;
          opponentBoardMatrix[i][j] = 0;
        }
      }


      // accept Ethereum amount:
      App.showAcceptEthAmount();
    }).catch(function (err) {
      //alert("ERROR: " + err.message);
      console.log(err.message);
    });
  },

  showAcceptEthAmount: function () { // function to show the information of the board to accept the game
    $('#joinSpecificGame').hide();
    $('#createOrJoin').hide();
    document.getElementById('acceptAmountText').innerHTML = "<h2>Do you want to start the game with id " + gameId + "?</h2>" +
      "<h2>The board have a size equal to " + boardSize + " and " + shipNumber + " ships.</h2>" +
      "<h2>The amount of ETH to bet is " + ethAmmount + " ETH.</h2>";
    $('#acceptAmount').show();
  },


  acceptEthAmount: function () { // function to accept the ethereum amount
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, true);
    }).then(async function (logArray) {
      App.handleEvents();
    }).catch(function (err) {
      //alert("ERROR: " + err.message);
      console.log(err.message);
    });
  },

  refuseEthAmount: function () { // function to refuse the ethereum amount
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, false);
    }).then(async function (logArray) {
      App.backToMainMenu();
    }).catch(function (err) {
      //alert("ERROR: " + err.message);
      console.log(err.message);
    });
  },


  handleEvents: async function () { // function to handle the event received from an opponent
    let lastBlock = null;

    await newInstance.allEvents(
      (err, events) => {

        if (events.event == "AmountEthResponse" && events.args._gameId.toNumber() == gameId && events.blockNumber != lastBlock) {
          lastBlock = events.blockNumber;
          if (events.args._response) { // the opponent have refuse the ethereum amount
            return;
          }

          // start placement fase:
          $('#gameFase').show();
          $('#acceptAmount').hide();
          $('#waitingOpponent').hide();

          App.createBoardTable();
        }
        else if (events.event == "ShootShip" && events.args._gameId.toNumber() == gameId && events.args._address == web3.eth.defaultAccount && events.blockNumber != lastBlock) {
          lastBlock = events.blockNumber;

          const cellRow = events.args._row.toNumber();
          const cellCol = events.args._col.toNumber();
          const cell = document.querySelector(
            `div.my-cell[data-row='${cellRow}'][data-col='${cellCol}']`
          );

          var hit;
          if (myBoardMatrix[cellRow][cellCol] === 0) {
            cell.innerHTML = "✖";
            $('#messageInfo').text("Your opponent miss the shot, it is your turn!");
            hit = 0;
          }
          else {
            cell.innerHTML = '💥';
            $('#messageInfo').text("Your opponent hit the shot, it is your turn!");
            hit = 1;
            myShipsHitted++;
          }

          var merkleProof = App.createMerkleProof(cellRow, cellCol);
          var hash = App.getHash(cellRow, cellCol);

          App.contracts.BattleShipGame.deployed().then(async function (instance) {
            newInstance = instance
            return newInstance.shootResult(gameId, cellRow, cellCol, hit, hash, merkleProof);
          }).then(async function (logArray) {
            isMyTurn = true;
          }).catch(function (err) {
            //alert("ERROR: " + err.message);
            console.log(err.message);
          });
        }
        else if (events.event == "ShootResult" && events.args._gameId.toNumber() == gameId && events.args._address == web3.eth.defaultAccount && events.blockNumber != lastBlock) {
          lastBlock = events.blockNumber;

          const cellRow = events.args._row.toNumber();
          const cellCol = events.args._col.toNumber();
          const cell = document.querySelector(
            `div.opponent-cell[data-row='${cellRow}'][data-col='${cellCol}']`
          );

          var result = events.args._result.toNumber();

          var checkResult = events.args._merkleCheck.toNumber();

          console.log("DEBUG: Sparo avvenuto sulla cella [" + cellRow + "][" + cellCol + "], risultato: " + result + ", controllo: " + checkResult);

          if (result === 0) {
            cell.innerHTML = "✖";
            $('#messageInfo').text("You miss the shot, it is your opponent's turn!");
          } else {
            cell.innerHTML = '💥';
            $('#messageInfo').text("You hit the shot, it is your opponent's turn!");
          }

          isMyTurn = false;
        }

      });
  },

  createBoardTable: function () { // function to create a board for the placement fase
    // get the div "gameBoard" and add the template size
    const board = document.getElementById('gameBoard');
    board.style = "grid-template-columns: 40px repeat(" + boardSize + ", 1fr);grid-template-rows: 40px repeat(" + boardSize + ", 1fr);"

    // creation of the header colum:
    for (let j = 0; j <= boardSize; j++) {
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      if (j > 0) {
        headerCell.textContent = String.fromCharCode(64 + j);
      }
      board.appendChild(headerCell);
    }

    for (let i = 0; i < boardSize; i++) {
      // creation of the header row
      const headerCell = document.createElement("div");
      headerCell.classList.add("header-cell");
      headerCell.textContent = i + 1;

      board.appendChild(headerCell);

      // creation of the board with placing button
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

  placeShip: function (event) { // function to add a ship in a specific position of the board
    if (gameStarted) {
      alert("The game has started, you can't change the position of the ships!")
      return;
    }

    const cellRow = event.target.dataset.row;
    const cellCol = event.target.dataset.col;
    const cell = document.querySelector(
      `div.my-cell[data-row='${cellRow}'][data-col='${cellCol}']`
    );

    if (shipPlaced == shipNumber && myBoardMatrix[cell.dataset.row][cell.dataset.col] === 0) {
      return;
    }

    if (myBoardMatrix[cell.dataset.row][cell.dataset.col] == 0) {
      // insert the ship in the position
      cell.classList.add('ship');
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 1;
      shipPlaced++;
      let remainingShips = shipNumber - shipPlaced;
      $('#submitInfo').text("Ship placed, " + remainingShips + " remaining!");
    } else {
      // remove the ship if already present
      cell.classList.remove('ship');
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 0;
      shipPlaced--;
      let remainingShips = shipNumber - shipPlaced;
      $('#submitInfo').text("Ship removed, " + remainingShips + " remaining!");
      const submit = document.getElementById('submitBtn');
      submit.style.color = "hsl(221, 100%, 50%)";
      submit.removeEventListener("click", sumbitBoardFunction);
    }

    // when all the ship are placed, submit button enable
    if (shipPlaced == shipNumber) {
      $('#submitInfo').text("All ships placed, click here to submit your board!");
      const submit = document.getElementById('submitBtn');
      submit.style.color = "red";
      submit.addEventListener("click", sumbitBoardFunction);
    }
  },

  submitBoard: function () { // function tu submit the board to the opponent
    if (shipPlaced != shipNumber) {
      alert("Please place " + shipNumber + " ship!");
      return;
    }

    if (iHostTheGame) { // the creator of the game have the first move
      isMyTurn = true;
    }
    else {
      isMyTurn = false;
    }

    merkleTree = App.createMerkleTree();
    merkleRoot = merkleTree[merkleTree.length - 1][0];

    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.submitBoard(gameId, merkleRoot);
    }).then(async function (logArray) {
      if (isMyTurn) {
        $('#messageInfo').text("Game started, it is your turn!");
      }
      else {
        $('#messageInfo').text("Game started, wait for opponent move!");
      }
      $('#opponentBoard').show();
      $('#submitBtn').hide();

      gameStarted = true;
      App.startBattleFase();
    }).catch(function (err) {
      //alert("ERROR: " + err.message);
      console.log(err.message);
    });

  },

  startBattleFase: function () { // function to show the opponentBoard and start the shoot fase
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
        cell.addEventListener("click", (event) => App.handleShoot(event));
        board.appendChild(cell);
      }
    }
  },

  handleShoot: function (event) { // function to handle the shot on a cell
    var cellRow = event.target.dataset.row;
    var cellCol = event.target.dataset.col;

    if (!isMyTurn) {
      alert("It is the opponent turn, please wait for him!");
      return;
    }

    if (opponentBoardMatrix[cellRow][cellCol] == 1) {
      alert("You have already attackd this cell, try again!");
      return;
    }
    opponentBoardMatrix[cellRow][cellCol] = 1;

    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.shoot(gameId, cellRow, cellCol);
    }).then(function (reciept) {
    }).catch(function (err) {
      //alert("ERROR: " + err.message);
      console.log(err.message);
    });
  },

  createMerkleTree: function () {
    if (myBoardMatrix == null) {
      alert("Board is null!")
      return;
    }

    var merkleTreeMatrix = [];

    var temp = [];
    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        temp.push(window.web3Utils.soliditySha3(myBoardMatrix[i][j].toString() + Math.floor(Math.random() * 10)));
      }
    }

    merkleTreeMatrix.push(temp);

    while (temp.length > 1) {
      const nextLevel = [];
      for (let j = 0; j < temp.length; j += 2) {
        const leftChild = temp[j];
        const rightChild = temp[j + 1];
        nextLevel.push(window.web3Utils.soliditySha3(leftChild + rightChild.slice(2)));
      }
      temp = nextLevel;
      merkleTreeMatrix.push(nextLevel);
    }

    return merkleTreeMatrix;
  },

  getHash: function (row, col) {
    var targetIndex = row * boardSize + col;

    return merkleTree[0][targetIndex];
  },

  createMerkleProof: function (row, col) {
    const merkleProof = [];
    let index = (row * boardSize) + col;

    for (let i = 0; i < (merkleTree.length - 1); i++) {
      if (index % 2 == 0) {
        merkleProof.push(merkleTree[i][index + 1]);
        index = index / 2;
      }
      else {
        merkleProof.push(merkleTree[i][index - 1]);
        index = (index - 1) / 2;
      }
    }

    return merkleProof;
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});