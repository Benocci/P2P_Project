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
        bytes32 creatorMerkleRoot;
        bytes32 joinerMerkleRoot;
        uint256 creatorNumShips;
        uint256 joinerNumShips;
    }

    mapping(uint256 => gameInfo) public gameList; // map of game's ID (gameId => information of that game)
    uint256[] public avaibleGame; // array with all the gameId of the avaible game

    uint256 public gameId = 1; // value of the next gameId

    // error event:
    error OutputError(string myError);

    // event:
    event GameCreated(uint256 indexed _gameId);

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
        uint256 indexed _gameId,
        bytes32 _merkleRootCreator,
        bytes32 _merkleRootJoiner
    );

    event ShootShip(
        uint256 indexed _gameId,
        address _address,
        uint256 _row,
        uint256 _col
    );

    event ShootResult(
        uint256 indexed _gameId,
        address _address,
        uint256 _row,
        uint256 _col,
        uint256 _result,
        uint256 _shipsRemaining
    );

    event GameEnded(
        uint256 indexed _gameId,
        address _winner,
        address _loser,
        uint256 _reason
    );

    constructor() {}

    // function to return the gameId
    function getId() public returns (uint256 toReturn) {
        toReturn = gameId++;
        return toReturn;
    }

    // function to remove an element of the array avaibleGame
    function removeFromArray(uint256 _gameId) public returns (bool) {
        uint256 index;
        bool find = false;

        // loop through the avaible game until find the index of the chosen one
        for (uint i = 0; i < avaibleGame.length; i++) {
            if (avaibleGame[i] == _gameId) {
                index = i;
                find = true;
                break;
            }
        }

        if (!find || index >= avaibleGame.length) {
            return find;
        }

        for (uint i = index; i < avaibleGame.length - 1; i++) {
            // move manually all the element
            avaibleGame[i] = avaibleGame[i + 1];
        }
        delete avaibleGame[avaibleGame.length - 1]; // remove the last element
        return find;
    }

    function getRandomNumber(uint256 bound) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) %
            bound;
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

    function createGame(
        // function to create a new game
        uint256 _boardSize,
        uint256 _shipNum,
        uint256 _ethAmount
    ) public {
        // create a new game

        // Check if the board size and ship number are valid
        if (_boardSize <= 0 || _shipNum <= 0) {
            revert OutputError("Invalid board size or ship number!");
        }

        uint256 newGameId = getId();

        gameList[newGameId] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            _ethAmount,
            0,
            0,
            _shipNum,
            _shipNum
        );
        avaibleGame.push(newGameId);
        emit GameCreated(newGameId);
    }

    function joinGame(uint256 _gameId) public {
        // function to join a game
        // check if there are avaible game
        if (avaibleGame.length < 1) {
            revert OutputError("No open games!");
        }

        uint256 chosenGameId;

        if (_gameId == 0) {
            //random game choice
            chosenGameId = randomGame();
        } else {
            //specific game
            chosenGameId = _gameId;
            bool find = removeFromArray(chosenGameId);

            if (!find) {
                revert OutputError("This game does not exist!");
            }
        }

        if (chosenGameId <= 0) {
            revert OutputError("Chosen id negative!");
        }

        if (gameList[chosenGameId].joiner != address(0)) {
            revert OutputError("Game already taken!");
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

    function amountEthDecision(uint256 _gameId, bool _response) public {
        // function to accept or refuse the eth amount

        // Check if the game ID is valid
        if (_gameId <= 0) {
            revert OutputError("Game id is negative!");
        }

        // Check if the sender is either the creator or the joiner of the game
        if (gameList[_gameId].creator != msg.sender && gameList[_gameId].joiner != msg.sender) {
            revert OutputError("Player not in that game!");
        }

        if (!_response) {
            // refuse response
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

    function submitBoard(uint256 _gameId, bytes32 _merkleRoot) public {
        // function to submit the board

        // Check if the game ID is valid
        if (_gameId <= 0) {
            revert OutputError("Game id is negative!");
        }

        // Check if the sender is either the creator or the joiner of the game
        if (
            gameList[_gameId].creator != msg.sender &&
            gameList[_gameId].joiner != msg.sender
        ) {
            revert OutputError("Player not in that game!");
        }

        // Check if the board is not already submitted
        if (
            (gameList[_gameId].creator == msg.sender &&
                gameList[_gameId].creatorMerkleRoot != 0) ||
            (gameList[_gameId].joiner == msg.sender &&
                gameList[_gameId].joinerMerkleRoot != 0)
        ) {
            revert OutputError("Board already submitted!");
        }

        if (gameList[_gameId].creator == msg.sender) {
            gameList[_gameId].creatorMerkleRoot = _merkleRoot;
        } else if (gameList[_gameId].joiner == msg.sender) {
            gameList[_gameId].joinerMerkleRoot = _merkleRoot;
        } else {
            revert OutputError("Player not in that game!");
        }

        emit StartGame(
            _gameId,
            gameList[_gameId].creatorMerkleRoot,
            gameList[_gameId].joinerMerkleRoot
        );
    }

    function shoot(uint256 _gameId, uint256 _row, uint256 _col) public {
        // function to communicate the coordinates of the fired cell
        
        // Check if the game ID is valid
        if (_gameId <= 0) {
            revert OutputError("Game id is negative!");
        }

        // Check if the sender is either the creator or the joiner of the game
        if (
            gameList[_gameId].creator != msg.sender &&
            gameList[_gameId].joiner != msg.sender
        ) {
            revert OutputError("Player not in that game!");
        }

        // take the opponent address for comunicate who was shot
        address opponentAddress;
        if (msg.sender == gameList[_gameId].creator) {
            opponentAddress = gameList[_gameId].joiner;
        } else {
            opponentAddress = gameList[_gameId].creator;
        }

        emit ShootShip(_gameId, opponentAddress, _row, _col);
    }

    function shootResult(
        uint256 _gameId,
        uint256 _row,
        uint256 _col,
        uint256 _result,
        bytes32 _hash,
        bytes32[] memory _merkleProof
    ) public payable {
        // function to comunicate the result of the shot
        
        // Check if the game ID is valid
        if (_gameId <= 0) {
            revert OutputError("Game id is negative!");
        }

        // Check if the sender is either the creator or the joiner of the game
        if (
            gameList[_gameId].creator != msg.sender &&
            gameList[_gameId].joiner != msg.sender
        ) {
            revert OutputError("Player not in that game!");
        }

        // take the opponent address for comunicate who fired the shot
        address opponentAddress;
        bytes32 merkleRoot;
        if (msg.sender == gameList[_gameId].creator) {
            opponentAddress = gameList[_gameId].joiner;
            merkleRoot = gameList[_gameId].creatorMerkleRoot;
        } else {
            opponentAddress = gameList[_gameId].creator;
            merkleRoot = gameList[_gameId].joinerMerkleRoot;
        }

        bytes32 hashValue = _hash;

        uint256 index = _row * gameList[_gameId].boardSize + _col;
        for (uint i = 0; i < _merkleProof.length; i++) {
            if (index % 2 == 0) {
                hashValue = keccak256(
                    abi.encodePacked(hashValue, _merkleProof[i])
                );
            } else {
                hashValue = keccak256(
                    abi.encodePacked(_merkleProof[i], hashValue)
                );
            }

            index = index / 2;
        }

        uint256 shipsRemaining = 100;
        if (merkleRoot == hashValue) {
            // validated shoot
            if (msg.sender == gameList[_gameId].creator) {
                if (_result == 1) {
                    gameList[_gameId].joinerNumShips =
                        gameList[_gameId].joinerNumShips -
                        1;
                }
                shipsRemaining = gameList[_gameId].joinerNumShips;
            } else {
                if (_result == 1) {
                    gameList[_gameId].creatorNumShips =
                        gameList[_gameId].creatorNumShips -
                        1;
                }
                shipsRemaining = gameList[_gameId].creatorNumShips;
            }

            emit ShootResult(
                _gameId,
                opponentAddress,
                _row,
                _col,
                _result,
                shipsRemaining
            );
        } else {
            // invlidated shoot
            emit GameEnded(_gameId, opponentAddress, msg.sender, 0);
            payable(opponentAddress).transfer(gameList[_gameId].ethAmount * 2);
            return;
        }

        if (shipsRemaining <= 0) {
            payable(opponentAddress).transfer(gameList[_gameId].ethAmount * 2);

            emit GameEnded(_gameId, opponentAddress, msg.sender, 1);
        }
    }
}
