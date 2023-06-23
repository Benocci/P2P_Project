// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract BattleShipGame {
    struct gameInfo {
        address creator;
        address joiner;
        uint256 boardSize;
        uint256 shipNum;
        uint256 ethAmount;
        bool openGame;
    }

    mapping(uint256 => gameInfo) public gameList; //map of game's ID
    uint256[] public avaibleGame;

    uint256 public gameId=1;

    error OutputError(string myError);

    event AmountEthOffer(address _sender, uint256 _amount, uint256 indexed _gameId);

    event AmountEthConfirm(address _sender, uint256 _amount, uint256 indexed _gameId);

    event GameCreated(uint256 indexed _gameId);

    event GameJoined(
        uint256 indexed _gameId,
        address _creator,
        address _joiner,
        uint256 _boardSize,
        uint256 _shipNum
    );


    constructor () {}

    function randomGame() public returns (uint256 randGameId) {
        if(avaibleGame.length == 0){
            return 0;
        }

        for(uint256 i=0; i<avaibleGame.length; i++){
            randGameId = avaibleGame[i];
            if(randGameId!=0){
                avaibleGame[i] = 0;
                return randGameId;
            }
        }

        return 0;
    }

    function createGame(uint256 _boardSize, uint256 _shipNum) public {
        uint256 newGameId = gameId++;

        gameList[newGameId] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            0,
            true
        );
        avaibleGame.push(newGameId);
        emit GameCreated(newGameId);
    }

    function joinGame(uint256 _gameId) public {
        if(avaibleGame.length < 1){
            //TODO: handle the exception
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
            gameList[chosenGameId].shipNum);
    }


    function AmountEthCommit(uint256 _gameId, uint256 _amount) public {
        emit AmountEthOffer(
            msg.sender,
            _amount,
            _gameId);
    }

    function AmountEthAccept(uint256 _gameId) public {
        emit AmountEthConfirm(
            msg.sender,
            gameList[_gameId].ethAmount,
            _gameId);
    }
}
