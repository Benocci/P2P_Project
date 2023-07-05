// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract BattleShipGame {
    struct gameInfo {
        // struct with all the information about a game
        address creator;
        address joiner;
        uint256 boardSize;
        uint256 shipNum;
        uint256 ethAmount;
        uint256 merkleRoot;
    }

    mapping(uint256 => gameInfo) public gameList; // map of game's ID (gameId => information of that game)
    uint256[] public avaibleGame; // array with all the gameId of the avaible game

    uint256 public gameId = 1; // value of the next gameId

    // error event:
    error OutputError(string myError);

    // event:
    event GameCreated(
        uint256 indexed _gameId
    );

    event GameJoined(
        uint256 indexed _gameId,
        address _creator,
        address _joiner,
        uint256 _boardSize,
        uint256 _shipNum,
        uint256 _ethAmount
    );

    event AmountEthResponse(
        address _sender,
        uint256 _amount,
        uint256 indexed _gameId,
        bool response
    );

    event StartGame(
        uint256 indexed _gameId
    );

    constructor() {}

    // function to return the gameId
    function getId() public returns (uint256 toReturn) {
        toReturn = gameId++;
        return toReturn;
    }

    // function to remove an element of the array avaibleGame
    function removeFromArray(uint256 _gameId) public {
        uint256 index;
        bool find = false;

        // loop the avaible game until find the index of the chosen one
        for (uint i = 0; i < avaibleGame.length ; i++){
            if(avaibleGame[i] == _gameId){
                index = i;
                find = true;
                break;
            }
        }

        if (!find || index >= avaibleGame.length){
            return;
        }

        for (uint i = index; i<avaibleGame.length-1; i++){ // move manually all the element
            avaibleGame[i] = avaibleGame[i+1];
        }
        delete avaibleGame[avaibleGame.length-1]; // remove the last element
    }

    function getRandomNumber(uint256 bound) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % bound;
    }

    // function to get the gameId of an avaible game
    function randomGame() public returns (uint256 randGameId) {
        if (avaibleGame.length == 0) {
            return 0;
        }

        randGameId = avaibleGame[getRandomNumber(avaibleGame.length)];
        removeFromArray(randGameId);
        return randGameId;
    }

    function createGame( // function to create a new game
        uint256 _boardSize,
        uint256 _shipNum,
        uint256 _ethAmount
    ) public {
        // create a new game
        uint256 newGameId = getId();

        gameList[newGameId] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            _ethAmount,
            0
        );
        avaibleGame.push(newGameId);
        emit GameCreated(newGameId);
    }

    function joinGame(uint256 _gameId) public { // function to join a game
        // check if there are avaible game
        if (avaibleGame.length < 1) {
            revert OutputError({myError: "No open games!"});
        }

        uint256 chosenGameId;

        if (_gameId == 0) {
            //random game choice
            chosenGameId = randomGame();
        } else {
            //specific game
            chosenGameId = _gameId;
            removeFromArray(chosenGameId);
        }

        if(chosenGameId <= 0){
            revert OutputError({myError: "Chosen id negative!"});
        }

        if (gameList[chosenGameId].joiner != address(0)) {
            revert OutputError({myError: "Game already taken!"});
        }
        gameList[chosenGameId].joiner = msg.sender;

        emit GameJoined(
            chosenGameId,
            gameList[chosenGameId].creator,
            gameList[chosenGameId].joiner,
            gameList[chosenGameId].boardSize,
            gameList[chosenGameId].shipNum,
            gameList[chosenGameId].ethAmount
        );
    }

    function amountEthDecision(uint256 _gameId, bool _response) public { // function to accept or refuse the eth amount
        if (!_response) { // refuse response
            gameList[_gameId].joiner = address(0);
            avaibleGame.push(_gameId);
        }

        emit AmountEthResponse(
            msg.sender,
            gameList[_gameId].ethAmount,
            _gameId,
            _response
        );
    }

    function submitBoard(uint256 _gameId, uint256 _merkleRoot) public {
        //TODO: check
        if(_gameId <= 0){
            revert OutputError({myError: "Game id is negative!"});
        }

        if(gameList[_gameId].creator == msg.sender || gameList[_gameId].joiner == msg.sender){
            gameList[_gameId].merkleRoot = _merkleRoot; 
        }
        else{
            revert OutputError({myError: "Player not in that game!"});
        }
        
        emit StartGame(
            _gameId
        );
    }
}
