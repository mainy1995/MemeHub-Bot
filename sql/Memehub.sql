-- phpMyAdmin SQL Dump
-- version 4.6.6deb4
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 09. Apr 2019 um 22:52
-- Server-Version: 10.1.37-MariaDB-0+deb9u1
-- PHP-Version: 7.0.33-0+deb9u3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `Memehub`
--

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `MemeAnzahl`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `MemeAnzahl` (
`Username` varchar(100)
,`UserID` varchar(100)
,`meme_sum` bigint(21)
);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `memes`
--

CREATE TABLE `memes` (
  `id` int(11) NOT NULL,
  `UserID` varchar(100) DEFAULT NULL,
  `photoID` varchar(100) DEFAULT NULL,
  `categorie` varchar(100) DEFAULT NULL,
  `privMessageID` int(11) DEFAULT NULL,
  `groupMessageID` int(11) DEFAULT NULL,
  `date` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `Statistik`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `Statistik` (
`photoID` varchar(100)
,`UserID` varchar(100)
,`upvotes` bigint(21)
);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `user`
--

CREATE TABLE `user` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(100) DEFAULT NULL,
  `Vorname` varchar(100) DEFAULT NULL,
  `Nachname` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `votes`
--

CREATE TABLE `votes` (
  `id` int(11) NOT NULL,
  `userID` varchar(100) NOT NULL,
  `photoID` varchar(150) NOT NULL,
  `vote` tinyint(1) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Struktur des Views `MemeAnzahl`
--
DROP TABLE IF EXISTS `MemeAnzahl`;

CREATE ALGORITHM=UNDEFINED DEFINER=`MemehubBOT`@`%` SQL SECURITY DEFINER VIEW `MemeAnzahl`  AS  select `u`.`Username` AS `Username`,`m`.`UserID` AS `UserID`,count(`m`.`photoID`) AS `meme_sum` from (`memes` `m` left join `user` `u` on((`m`.`UserID` = `u`.`UserID`))) group by `m`.`UserID` ;

-- --------------------------------------------------------

--
-- Struktur des Views `Statistik`
--
DROP TABLE IF EXISTS `Statistik`;

CREATE ALGORITHM=UNDEFINED DEFINER=`MemehubBOT`@`%` SQL SECURITY DEFINER VIEW `Statistik`  AS  select `m`.`photoID` AS `photoID`,`m`.`UserID` AS `UserID`,count(`v`.`vote`) AS `upvotes` from (`memes` `m` join `votes` `v` on((`m`.`photoID` = `v`.`photoID`))) group by `m`.`photoID` ;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `memes`
--
ALTER TABLE `memes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `photoID` (`photoID`);

--
-- Indizes für die Tabelle `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`UserID`);

--
-- Indizes für die Tabelle `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `userIDphotoID` (`userID`,`photoID`) USING BTREE;

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `memes`
--
ALTER TABLE `memes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;
--
-- AUTO_INCREMENT für Tabelle `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=320;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
