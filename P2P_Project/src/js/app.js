var gameId = null;
var ethAmmount = null;
var boardSize = null;
var board = null;
var shipNumber = null;
var shipPlaced = 0;
var merkleProofMatrix = [];
var myBoardMatrix = null;
var iHostTheGame = null;
var isMyTurn = null;
var attackRow = null;
var attackCol = null;

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

  joinSpecificGame: function () { // function to show the join a speciic game menu
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
      if (boardSize % 2 != 0 || boardSize <= 0) { // size of the board is a positive number muliple of 2
        alert("The board size have to be a positive number multilpe of 2!");
        return;
      }
      if (shipNumber <= 0) { // number of the ship > 0
        alert("The number of ships have to be a positive number!");
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

          for (var i = 0; i < boardSize; i++) {
            myBoardMatrix[i] = [];
            for (var j = 0; j < boardSize; j++) {
              myBoardMatrix[i][j] = 0;
            }
          }

          // waiting for the opponent:
          App.handleEvents();
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

      // board inizialization:
      myBoardMatrix = [];

      for (var i = 0; i < boardSize; i++) {
        myBoardMatrix[i] = [];
        for (var j = 0; j < boardSize; j++) {
          myBoardMatrix[i][j] = 0;
        }
      }


      // accept Ethereum amount:
      App.showAcceptEthAmount();
    }).catch(function (err) {
      console.error(err);
    });
  },

  showAcceptEthAmount: function () {
    $('#joinSpecificGame').hide();
    $('#createOrJoin').hide();
    $('#acceptAmountText').text("To start the game with id " + gameId + " you have to bet this amount of Ethereum: " + ethAmmount + ".")
    $('#acceptAmount').show();
  },


  acceptEthAmount: function () { // function to accept the ethereum amount
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, true);
    }).then(async function (logArray) {
      App.handleEvents();
    }).catch(function (err) {
      console.error(err);
    });
  },

  refuseEthAmount: function () { // function to refuse the ethereum amount
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.amountEthDecision(gameId, false);
    }).then(async function (logArray) {
      App.backToMainMenu();
    }).catch(function (err) {
      console.error(err);
    });
  },


  handleEvents: async function () { // function to handle the event received from an opponent
    await newInstance.allEvents(
      (err, events) => {

        if (events.event == "AmountEthResponse" && events.args._gameId.toNumber() == gameId) {
          if (events.args._response) { // the opponent have refuse the ethereum amount
            return App.handleEvents();
          }

          // start placement fase:
          $('#gameFase').show();
          $('#acceptAmount').hide();
          $('#waitingOpponent').hide();

          App.createBoardTable();
          //alert("DEBUG: Creazione board piazzamento");
        }
        else if (events.event == "ShootShip" && events.args._gameId.toNumber() == gameId && events.args._address == web3.eth.defaultAccount) {
          const cellRow = events.args._row.toNumber();
          const cellCol = events.args._col.toNumber();

          //alert("DEBUG: SPARO RICEVUTO SU [" + cellRow + "][" + cellCol + "]");

          const cell = document.querySelector(
            `div.my-cell[data-row='${cellRow}'][data-col='${cellCol}']`
          );

          var hit;
          if (myBoardMatrix[cellRow][cellCol] === 0) {
            cell.innerHTML = "✖";
            $('#messageInfo').text("Your opponent miss the shot, it is your turn!");
            hit = 0;
          }
          else if (myBoardMatrix[cellRow][cellCol] !== 0) {
            cell.innerHTML = '💥';
            $('#messageInfo').text("Your opponent hit the shot, it is your turn!");
            hit = 1;
          }

          isMyTurn = true;

          App.contracts.BattleShipGame.deployed().then(async function (instance) {
            newInstance = instance
            return newInstance.shootResult(gameId, cellRow, cellCol, hit);
          }).then(async function (logArray) {
          }).catch(function (err) {
            console.error(err);
          });
        }
        else if (events.event == "ShootResult" && events.args._gameId.toNumber() == gameId  && events.args._address == web3.eth.defaultAccount) {
          const cellRow = events.args._row.toNumber();
          const cellCol = events.args._col.toNumber();
          const cell = document.querySelector(
            `div.opponent-cell[data-row='${cellRow}'][data-col='${cellCol}']`
          );

          var result = events.args._result.toNumber();

          if (result === 0) {
            cell.innerHTML = "✖";
            $('#messageInfo').text("You miss the shot, it is your opponent's turn!");
          } else if (result !== 0) {
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
    const cellRow = event.target.dataset.row;
    const cellCol = event.target.dataset.col;
    const cell = document.querySelector(
      `div.my-cell[data-row='${cellRow}'][data-col='${cellCol}']`
    );

    if (shipPlaced == shipNumber && myBoardMatrix[cell.dataset.row][cell.dataset.col] === 0) {
      return;
    }

    if (myBoardMatrix[cell.dataset.row][cell.dataset.col] == 0) {
      //alert("DEBUG: AGGIUNGO NAVE, Nave numero " + shipPlaced + " su " + shipNumber);
      // insert the ship in the position
      cell.classList.add('ship');
      $('#messageInfo').text("Ship placed!");
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 1;
      shipPlaced++;
    } else {
      //alert("DEBUG: RIMUOVO NAVE, Nave numero " + shipPlaced + " su " + shipNumber + ", valore=" + myBoardMatrix[cell.dataset.row][cell.dataset.col]);
      // remove the ship if already present
      cell.classList.remove('ship');
      $('#messageInfo').text("Ship removed!");
      myBoardMatrix[cell.dataset.row][cell.dataset.col] = 0;
      shipPlaced--;
    }

    // when all the ship are placed, submit button enable
    if (shipPlaced == shipNumber) {
      //alert("All the ship placed!");
      const submit = document.getElementById('submitBtn');
      submit.addEventListener("click", () => App.submitBoard());
    }
  },

  submitBoard: function () { // function tu submit the board to the opponent
    if (shipPlaced != shipNumber) {
      alert("Please place " + shipNumber + " ship!");
      return;
    }

    if (iHostTheGame) {
      isMyTurn = true;
    }
    else {
      isMyTurn = false;
    }

    //var merkleRoot = App.createMerkleTree()

    //alert("DEBUG: sottomissione board");
    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.submitBoard(gameId, 0);
    }).then(async function (logArray) {
      if (isMyTurn) {
        $('#messageInfo').text("Game started, it is your turn!");
      }
      else {
        $('#messageInfo').text("Game started, wait for opponent move!");
      }
      $('#opponentBoard').show();
      $('#submitBtn').hide();
      App.startBattleFase();
    }).catch(function (err) {
      console.error(err);
    });

  },

  createMerkleTree: async function () {
    var boardArray = [];

    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        boardArray.push(myBoardMatrix[i][j]);
      }
    }

    var hashedArray = [];
    for (let i = 0; i < boardArray.length; i++) {
      hashedArray.push(window.web3Utils.keccak256(boardArray[i] + Math.floor(Math.random() * 10)));
    }

    merkleProofMatrix.push(hashedArray);

    var tmpArray = [];

    while (true) {
      tmpArray = [];

      for (let i = 0; i < hashedArray.length; i = i + 2) {
        if (i + 1 < hashedArray.length) {
          tmpArray.push(window.web3Utils.keccak256(App.xor(hashedArray[i], hashedArray[i + 1])));
        }
      }

      hashedArray = tmpArray;
      merkleProofMatrix.push(hashedArray);
      if (tmpArray.length == 1 || tmpArray.length == 0) {
        return tmpArray[0];
      }
    }
  },

  merkleProof: function (row, col) {
    var merkleProof = [];
    let flatIndex = row * boardDim + col;
    merkleProofMatrix.forEach(arr => {
      if (arr.length > 1) {
        if (flatIndex % 2 == 0) {
          merkleProof.push((arr[flatIndex + 1]).toString());
          flatIndex = flatIndex / 2;
        } else {
          merkleProof.push((arr[flatIndex - 1]).toString());
          flatIndex = (flatIndex - 1) / 2;
        }
      }

    });

    return merkleProof;
  },

  merkleProofAttack: function (attackRes, hash, merkleProof) {
    App.contracts.Battleship.deployed().then(function (instance) {
      battleshipInstance = instance;
      return battleshipInstance.MerkleProofAttack(gameId, attackRes.toString(), hash, merkleProof);
    }).then(function (reciept) {
    }).catch(function (err) {
      console.error(err);
    });
  },

  xor: function (a, b) {
    var BN = window.web3Utils.BN;
    let c = new BN(a.slice(2), 16).xor(new BN(b.slice(2), 16)).toString(16);
    result = "0x" + c.padStart(64, "0");
    return result;
  },

  startBattleFase: function () {
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

    App.handleEvents();
  },

  handleCellClick: function (event) {
    var cellRow = event.target.dataset.row;
    var cellCol = event.target.dataset.col;

    if (!isMyTurn) {
      alert("It is the opponent turn, please wait for him!");
      return;
    }

    //alert("You shoot the cell [" + cellRow + "][" + cellCol + "]");

    App.contracts.BattleShipGame.deployed().then(async function (instance) {
      newInstance = instance
      return newInstance.shoot(gameId, cellRow, cellCol);
    }).then(function (reciept) {
      App.handleEvents();
    }).catch(function (err) {
      console.error(err);
    });
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});