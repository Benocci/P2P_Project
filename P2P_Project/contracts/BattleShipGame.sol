// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract BattleShipGame {
    struct gameInfo { // struct with all the information about a game
        address creator;
        address joiner;
        uint256 boardSize;
        uint256 shipNum;
        uint256 ethAmount;
        bool openGame;
    }

    mapping(uint256 => gameInfo) public gameList; // map of game's ID (gameId => information of that game)
    uint256[] public avaibleGame; // array with all the gameId of the avaible game

    uint256 public gameId=1; // value of the next gameId

    // error event:
    error OutputError(string myError);

    // event:
    event AmountEthOffer(address _sender, uint256 _amount, uint256 indexed _gameId);

    event AmountEthConfirm(address _sender, uint256 _amount, uint256 indexed _gameId);

    event GameCreated(uint256 indexed _gameId);

    event GameJoined(
        uint256 indexed _gameId,
        address _creator,
        address _joiner,
        uint256 _boardSize,
        uint256 _shipNum,
        uint256 _ethAmount
    );


    constructor () {}

    // utility functions:


    // function to return the gameId
    function getId() public returns (uint256 toReturn){
        toReturn = gameId++;
        return toReturn;
    }

    // function to get the gameId of an avaible game
    function randomGame() public returns (uint256 randGameId) {
        if(avaibleGame.length == 0){
            return 0;
        }

        for(uint256 i=0; i<avaibleGame.length; i++){
            randGameId = avaibleGame[i];
            if(randGameId!=0){
                avaibleGame[i] = 0; // TODO make a pop function tu extract the first element of the array
                return randGameId;
            }
        }

        return 0;
    }

    function createGame(uint256 _boardSize, uint256 _shipNum, uint256 _ethAmount) public { // create a new game
        uint256 newGameId = getId();

        gameList[newGameId] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            _ethAmount,
            true
        );
        avaibleGame.push(newGameId);
        emit GameCreated(newGameId);
    }

    function joinGame(uint256 _gameId) public { // join a new game
        if(avaibleGame.length < 1){
            revert OutputError({myError: "No open games"});
        }
        
        uint256 chosenGameId;

        if(_gameId == 0){ //random game choice
            chosenGameId = randomGame();
        }
        else{ //specific game
            chosenGameId = _gameId;
        }

        gameList[chosenGameId].joiner = msg.sender;
        emit GameJoined(
            _gameId,
            gameList[chosenGameId].creator,
            gameList[chosenGameId].joiner,
            gameList[chosenGameId].boardSize,
            gameList[chosenGameId].shipNum,
            gameList[chosenGameId].ethAmount);
    }

    // 
    function AmountEthCommit(uint256 _gameId, uint256 _amount) public {
        emit AmountEthOffer(
            msg.sender,
            _amount,
            _gameId);
    }

    // 
    function AmountEthAccept(uint256 _gameId) public {
        emit AmountEthConfirm(
            msg.sender,
            gameList[_gameId].ethAmount,
            _gameId);
    }
}
