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

    event GameCreated(
        uint256 indexed _gameId,
        uint256 boardSize,
        uint256 _shipNum
    );

    function createGame(uint256 _boardSize, uint256 _shipNum) public {
        uint256 gameIdToAdd;

        gameList[gameIdToAdd] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            0,
            true
        );
    }
}
