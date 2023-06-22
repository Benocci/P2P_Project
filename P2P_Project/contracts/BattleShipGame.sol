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

    uint256 public gameId=0;

    event GameCreated(
        uint256 indexed _gameId,
        uint256 _boardSize,
        uint256 _shipNum
    );


    constructor () {}

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

        emit GameCreated(newGameId, _boardSize, _shipNum);
    }
}
