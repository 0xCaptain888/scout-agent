// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TeamIds — canonical team ID constants and metadata
library TeamIds {
    uint16 constant ARG = 1;
    uint16 constant FRA = 2;
    uint16 constant BRA = 3;
    uint16 constant ENG = 4;
    uint16 constant ESP = 5;
    uint16 constant GER = 6;
    uint16 constant POR = 7;
    uint16 constant NED = 8;
    uint16 constant ITA = 9;
    uint16 constant BEL = 10;
    uint16 constant URU = 11;
    uint16 constant COL = 12;
    uint16 constant JPN = 13;
    uint16 constant KOR = 14;
    uint16 constant MAR = 15;
    uint16 constant SEN = 16;
    uint16 constant USA = 17;
    uint16 constant MEX = 18;
    uint16 constant CRO = 19;
    uint16 constant DEN = 20;
    uint16 constant AUS = 21;
    uint16 constant IRN = 22;
    uint16 constant SUI = 23;
    uint16 constant SWE = 24;

    function nameOf(uint16 id) internal pure returns (string memory) {
        if (id == ARG) return "ARG"; if (id == FRA) return "FRA";
        if (id == BRA) return "BRA"; if (id == ENG) return "ENG";
        if (id == ESP) return "ESP"; if (id == GER) return "GER";
        if (id == POR) return "POR"; if (id == NED) return "NED";
        if (id == ITA) return "ITA"; if (id == BEL) return "BEL";
        if (id == URU) return "URU"; if (id == COL) return "COL";
        if (id == JPN) return "JPN"; if (id == KOR) return "KOR";
        if (id == MAR) return "MAR"; if (id == SEN) return "SEN";
        if (id == USA) return "USA"; if (id == MEX) return "MEX";
        if (id == CRO) return "CRO"; if (id == DEN) return "DEN";
        if (id == AUS) return "AUS"; if (id == IRN) return "IRN";
        if (id == SUI) return "SUI"; if (id == SWE) return "SWE";
        return "???";
    }

    function colorOf(uint16 id) internal pure returns (string memory) {
        if (id == ARG) return "#74ACDF"; if (id == FRA) return "#0055A4";
        if (id == BRA) return "#FEDF00"; if (id == ENG) return "#CE1124";
        if (id == ESP) return "#AA151B"; if (id == GER) return "#FFCE00";
        if (id == POR) return "#006600"; if (id == NED) return "#FF7F00";
        if (id == ITA) return "#008C45"; if (id == BEL) return "#FAE042";
        if (id == URU) return "#7B9DD0"; if (id == COL) return "#FCD116";
        if (id == JPN) return "#BC002D"; if (id == KOR) return "#003478";
        if (id == MAR) return "#C1272D"; if (id == SEN) return "#00853F";
        if (id == USA) return "#3C3B6E"; if (id == MEX) return "#006847";
        return "#888888";
    }
}
