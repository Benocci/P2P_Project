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
        uint256 ethBetted;
        bytes32 creatorMerkleRoot;
        bytes32 joinerMerkleRoot;
        uint256 creatorNumShips;
        uint256 joinerNumShips;
        uint256 accusationTime;
        address accuser;
    }

    mapping(uint256 => gameInfo) public gameList; // map of game's ID (gameId => information of that game)
    uint256[] public availableGames; // array with all the gameId of the avaible game

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

    event AccusationTrigger(
        uint256 indexed _gameId,
        address _accused,
        address _accuser
    );

    event GameEnded(
        uint256 indexed _gameId,
        address _winner,
        address _loser,
        uint256 _reason
    );

    event ResolveAccuse(
        uint256 indexed _gameId,
        address _accuser
    );

    constructor() {}

    // function to return the gameId
    function getId() private returns (uint256 toReturn) {
        toReturn = gameId++;
        return toReturn;
    }

    // function to remove an element of the array availableGames
    function removeFromArray(uint256 _gameId) private returns (bool) {
        uint256 index;
        bool find = false;

        // loop through the avaible game until find the index of the chosen one
        for (uint i = 0; i < availableGames.length; i++) {
            if (availableGames[i] == _gameId) {
                index = i;
                find = true;
                break;
            }
        }

        if (!find || index >= availableGames.length) {
            return find;
        }

        for (uint i = index; i < availableGames.length - 1; i++) {
            // move manually all the element
            availableGames[i] = availableGames[i + 1];
        }
        
        availableGames.pop(); // remove the last element
        
        return find;
    }

    function getRandomNumber(uint256 bound) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) %
            bound;
    }

    // function to get the gameId of an avaible game
    function randomGame() private returns (uint256 randGameId) {
        if (availableGames.length == 0) {
            return 0;
        }

        randGameId = availableGames[getRandomNumber(availableGames.length)];
        removeFromArray(randGameId);
        return randGameId;
    }

    // GAS EVALUATION:
    //  with boardSize=4, shipNum=3, ethAmount=2:
    //    - Gas used: 222881
    //    - Total Price: 0.00033432 ETH
    //
    function createGame(
        // function to create a new game
        uint256 _boardSize,
        uint256 _shipNum,
        uint256 _ethAmount
    ) public payable {
        // create a new game

        // Check if the board size and ship number are valid
        if (_boardSize <= 0 || _shipNum <= 0) {
            revert OutputError("Invalid board size or ship number!");
        }

        require(msg.value == _ethAmount, "ETH amount are wrong!");

        uint256 newGameId = getId();

        gameList[newGameId] = gameInfo(
            msg.sender,
            address(0),
            _boardSize,
            _shipNum,
            _ethAmount,
            0,
            0,
            0,
            _shipNum,
            _shipNum,
            0,
            address(0)
        );
        availableGames.push(newGameId);

        gameList[newGameId].ethBetted += msg.value;

        emit GameCreated(newGameId);
    }

    // GAS EVALUATION:
    //  - specificGame:
    //    - Gas used: 68143
    //    - Total Price: 0.00010221 ETH
    //
    //  - randomGame:
    //    - Gas used: 61738
    //    - Total Price: 0.00009261 ETH 
    function joinGame(uint256 _gameId) public {
        // function to join a game
        // check if there are avaible game
        if (availableGames.length < 1) {
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

        if (gameList[chosenGameId].creator == msg.sender) {
            revert OutputError("You can't join a game created by yourself!");
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

    // GAS EVALUATION:
    //  - positive response:
    //    - Gas used: 36545
    //    - Total Price: 0.00005482 ETH
    //
    function amountEthDecision(uint256 _gameId, bool _response) public payable {
        // function to accept or refuse the eth amount

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

        if (!_response) {
            // refuse response
            gameList[_gameId].joiner = address(0);
            availableGames.push(_gameId);
        } else {
            require(
                msg.value == gameList[_gameId].ethAmount,
                "ETH amount are wrong!"
            );

            gameList[_gameId].ethBetted += msg.value;
        }

        emit AmountEthResponse(
            msg.sender,
            gameList[_gameId].ethAmount,
            _gameId,
            _response
        );
    }

    // GAS EVALUATION:
    //    - Gas used: 49767 - 50255
    //    - Total Price: 0.00007465 - 0.00007538 ETH
    //
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
    }

    // GAS EVALUATION:
    //    - Gas used: 31670
    //    - Total Price: 0.0000475 ETH
    //
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

        if(gameList[_gameId].accuser != address(0)){
            emit ResolveAccuse(_gameId, gameList[_gameId].accuser);
            gameList[_gameId].accuser = address(0);
            gameList[_gameId].accusationTime = 0;
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

    // GAS EVALUATION:
    //    - Gas used: 47020
    //    - Total Price: 0.00007053 ETH
    //
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

        uint256 shipsRemaining;
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
            payable(opponentAddress).transfer(gameList[_gameId].ethBetted);
            return;
        }

        if (shipsRemaining <= 0) {
            payable(opponentAddress).transfer(gameList[_gameId].ethBetted);

            emit GameEnded(_gameId, opponentAddress, msg.sender, 1);
        }
    }

    // GAS EVALUATION:
    //    - Gas used: 73799
    //    - Total Price: 0.0001107 ETH
    //
    function accuseOpponent(uint256 _gameId) public payable {
        // function to accuse the opponent of having left

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

        if (gameList[_gameId].accuser == address(0)) {
            gameList[_gameId].accuser = msg.sender;
            gameList[_gameId].accusationTime = block.number + 5;

            if (gameList[_gameId].accuser == gameList[_gameId].creator) {
                emit AccusationTrigger(
                    _gameId,
                    gameList[_gameId].joiner,
                    gameList[_gameId].creator
                );
            } else if (gameList[_gameId].accuser == gameList[_gameId].joiner) {
                emit AccusationTrigger(
                    _gameId,
                    gameList[_gameId].creator,
                    gameList[_gameId].joiner
                );
            }
        }
    }

    // GAS EVALUATION:
    //    - Gas used: 28303
    //    - Total Price: 0.00004245 ETH
    //
    function verifyAccuse(uint256 _gameId) public payable {
        if (gameList[_gameId].accuser == gameList[_gameId].creator) {
            if (gameList[_gameId].accusationTime <= block.number) {
                payable(gameList[_gameId].accuser).transfer(
                    gameList[_gameId].ethBetted
                );

                emit GameEnded(
                    _gameId,
                    gameList[_gameId].accuser,
                    gameList[_gameId].joiner,
                    2
                );
            }
        } else if (gameList[_gameId].accuser == gameList[_gameId].joiner) {
            if (gameList[_gameId].accusationTime <= block.number) {
                payable(gameList[_gameId].accuser).transfer(
                    gameList[_gameId].ethBetted
                );

                emit GameEnded(
                    _gameId,
                    gameList[_gameId].accuser,
                    gameList[_gameId].creator,
                    2
                );
            }
        } else {
            return;
        }
    }
}
