-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Creato il: Set 08, 2026 alle 12:35
-- Versione del server: 10.4.32-MariaDB
-- Versione PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ielectro_account`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `accounts`
--

CREATE TABLE `accounts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `surname` varchar(50) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(32) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `accounts`
--

INSERT INTO `accounts` (`id`, `username`, `name`, `surname`, `birthday`, `gender`, `email`, `phone_number`, `password_hash`, `email_verified_at`, `created_at`, `updated_at`) VALUES
(1, 'ielectro', 'iElectro', NULL, '2003-08-18', 'other', 'ielectrocompany@gmail.com', NULL, '$2y$10$nURhBlthy0ybwt2cTVX5a.FIscgRm4XEV8zXAz22yZS8mQwGL9Cp6', '2026-08-21 00:32:46', '2026-08-08 17:31:40', '2026-08-14 22:32:56'),
(2, 'distinia', 'Destiny', 'Omagu', '2004-12-08', 'male', 'distiniaa@gmail.com', NULL, '$2y$10$.t5/aWOJ5Lp/L5nn.xQffuZT4BXo75EBs8cIS6qzV.uTclwQ6hUPC', '2026-08-12 00:32:59', '2026-08-08 17:53:51', '2026-08-14 22:33:03');

-- --------------------------------------------------------

--
-- Struttura della tabella `account_activity`
--

CREATE TABLE `account_activity` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` enum('register','login','login_failed','logout','email_verified','email_changed','password_changed','password_reset','username_changed','profile_updated','phone_number_changed','session_revoked','deleted') NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `account_activity`
--

INSERT INTO `account_activity` (`id`, `account_id`, `action`, `details`, `ip_address`, `device_info`, `created_at`) VALUES
(1, NULL, 'login', 'Invalid credentials for milesi', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 12:25:43'),
(2, 1, 'register', 'Account created.', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 17:31:40'),
(3, 2, 'register', 'Account created.', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 17:53:51'),
(4, 2, '', 'Username changed: user66490752 -> distinia', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 17:55:16'),
(5, 2, '', 'Password set from profile', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:01:57'),
(6, 2, 'logout', 'Revoked all other sessions', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:07:07'),
(7, 2, 'session_revoked', 'Revoked session id 2', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:08:51'),
(8, 2, '', 'Account scheduled for deletion.', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:08:55'),
(9, 2, '', 'Scheduled account deletion cancelled.', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:16:26'),
(10, 2, 'session_revoked', 'Revoked session id 4', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:16:39'),
(11, 2, 'session_revoked', 'Revoked session id 5', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:17:01'),
(12, 2, 'session_revoked', 'Revoked all other sessions', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:38:07'),
(13, 2, 'session_revoked', 'Revoked session id 6', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:38:13'),
(14, 2, 'logout', 'User logged out', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:38:24'),
(15, 1, 'logout', 'User logged out', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:53:09'),
(18, 2, 'session_revoked', 'Revoked session id 15', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-12 11:50:58'),
(19, 2, 'login', 'Login from Google', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-23 12:30:46');

-- --------------------------------------------------------

--
-- Struttura della tabella `account_email_verifications`
--

CREATE TABLE `account_email_verifications` (
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `target_email` varchar(255) NOT NULL,
  `otp_code` varchar(12) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `account_oauth_pending`
--

CREATE TABLE `account_oauth_pending` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider` enum('google','apple','github','discord') NOT NULL,
  `provider_account_id` varchar(255) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `email` varchar(100) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `surname` varchar(100) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `account_password_resets`
--

CREATE TABLE `account_password_resets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `otp_code` varchar(12) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `account_password_resets`
--

INSERT INTO `account_password_resets` (`id`, `account_id`, `token_hash`, `otp_code`, `expires_at`, `used_at`, `created_at`) VALUES
(2, 1, '7dd4ea641be95c9d6ade7f7995b7a0c86fe4041a88cb0afb9bdf1cec88d90c02', '914837', '2026-08-08 19:59:36', NULL, '2026-08-08 17:39:36');

-- --------------------------------------------------------

--
-- Struttura della tabella `account_sessions`
--

CREATE TABLE `account_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `country` char(2) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `browser` varchar(100) DEFAULT NULL,
  `os` varchar(100) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `account_sessions`
--

INSERT INTO `account_sessions` (`id`, `account_id`, `token_hash`, `ip_address`, `country`, `city`, `browser`, `os`, `device_info`, `last_activity`, `expires_at`, `revoked_at`, `created_at`) VALUES
(1, 1, '9030c4813a274f7cf5e975fb0de9c0ef4988f1169ae3458a107b72466333e28a', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:53:09', '2026-08-09 19:31:40', '2026-08-08 20:53:09', '2026-08-08 17:31:40'),
(2, 2, '454e8d0e005b40199e6397c6986dab14e0c2662b0ebf6ccce97a20f55d51f42c', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:08:51', '2026-08-09 19:53:51', '2026-08-08 20:08:51', '2026-08-08 17:53:51'),
(3, 2, '3850d14ad8b3c189f6917e8a981076870b3d9d104fda3e19c29057f548109ada', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:08:55', '2026-08-09 20:08:41', '2026-08-08 20:08:55', '2026-08-08 18:08:41'),
(4, 2, '14a1ba460b4ae448dfee2cdfa189541cdbd05d02d0268169c857181fd166a4f4', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:16:39', '2026-08-09 20:09:04', '2026-08-08 20:16:39', '2026-08-08 18:09:04'),
(5, 2, '6d7cfe7d9fda12e105348ad77a496b7b1da2694e98c1a8d3e9b78aa1cab642e8', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:17:01', '2026-08-09 20:16:56', '2026-08-08 20:17:01', '2026-08-08 18:16:56'),
(6, 2, '1e8291bb906eb4915164d405928558882299f14d3649295d78b9f245e0dd4dfb', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:38:13', '2026-08-09 20:18:21', '2026-08-08 20:38:13', '2026-08-08 18:18:21'),
(7, 2, '647d5c1ecde16e9951ab3d06bc35cc6fddf5f6738e6221338e74ebbf1fa611a1', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-08 18:38:24', '2026-08-09 20:38:21', '2026-08-08 20:38:24', '2026-08-08 18:38:21'),
(8, 2, '14699b93fda31ea06e6a692c930603c882324b1cda46e22060160e3e03cc0edd', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-09 18:38:27', '2026-08-09 20:38:29', NULL, '2026-08-08 18:38:29'),
(9, 1, 'b54059c6457dbeaed746785e057fe019ca0deb8ba0a148b2dca23b506e700d1e', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-09 18:53:13', '2026-08-09 20:53:15', NULL, '2026-08-08 18:53:15'),
(10, 2, '1e835d63136ae1d8d85c0ff417817c039620eed58187fe19f5604c956b503607', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-10 13:25:57', '2026-08-10 20:52:50', NULL, '2026-08-09 18:52:50'),
(11, 1, 'd3fbdb067c97141c12b9245cc50da319c5a6955984ff62be5fb1959934d3ce79', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-10 13:05:48', '2026-08-10 20:53:39', NULL, '2026-08-09 18:53:39'),
(14, 2, '122f6f416c0ef79a25984bdf2f28aaeebf69bb581ec4689e9c5fd1598852f31a', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-11 18:11:07', '2026-08-11 21:03:17', NULL, '2026-08-10 19:03:17'),
(15, 2, 'a9abacf9f5aff57166e994c5f820828fb31bf2f4bee06d2250468ff03a6d57ce', '127.0.0.1', 'IT', 'Milan', 'Chrome 150.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', '2026-08-12 11:50:58', '2027-02-08 01:57:37', '2026-08-12 13:50:58', '2026-08-11 22:30:33'),
(16, 2, '45a2e5dcd686be5bf56e8a77c84afe1c8b617041d8136fa5f5a5f197d782c77b', '127.0.0.1', 'IT', 'Milan', 'Chrome 151.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-23 11:44:50', '2027-02-19 13:44:50', NULL, '2026-08-12 07:10:13'),
(17, 1, '1fd66be5f8754c4c13fdc8c8e1b71717717c682db1efd643b106df99824b26a4', '127.0.0.1', 'IT', 'Milan', 'Chrome 151.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-08-15 00:02:38', '2027-02-11 02:02:38', NULL, '2026-08-12 10:49:19'),
(19, 2, '8c5408f27f3136dcf4a4bd808a0e38b039986632810f2a299e1e81a435fb844c', '127.0.0.1', 'IT', 'Milan', 'Chrome 151.0.0.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '2026-09-08 10:29:55', '2027-03-07 12:29:55', NULL, '2026-08-23 12:30:46');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_accounts_username` (`username`),
  ADD UNIQUE KEY `uq_accounts_email` (`email`),
  ADD UNIQUE KEY `uq_accounts_phone_number` (`phone_number`),
  ADD KEY `idx_accounts_created` (`created_at`);

--
-- Indici per le tabelle `account_activity`
--
ALTER TABLE `account_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_account` (`account_id`),
  ADD KEY `idx_activity_action` (`action`),
  ADD KEY `idx_activity_created` (`created_at`);

--
-- Indici per le tabelle `account_email_verifications`
--
ALTER TABLE `account_email_verifications`
  ADD PRIMARY KEY (`account_id`),
  ADD KEY `idx_email_verifications_expires` (`expires_at`);

--
-- Indici per le tabelle `account_oauth_pending`
--
ALTER TABLE `account_oauth_pending`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_oauth_pending_token` (`token_hash`),
  ADD UNIQUE KEY `uq_oauth_provider_user` (`provider`,`provider_account_id`),
  ADD KEY `idx_oauth_pending_email` (`email`),
  ADD KEY `idx_oauth_pending_provider` (`provider`),
  ADD KEY `idx_oauth_pending_expires` (`expires_at`);

--
-- Indici per le tabelle `account_password_resets`
--
ALTER TABLE `account_password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_password_resets_token` (`token_hash`),
  ADD KEY `idx_password_resets_user` (`account_id`),
  ADD KEY `idx_password_resets_expires` (`expires_at`);

--
-- Indici per le tabelle `account_sessions`
--
ALTER TABLE `account_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sessions_token` (`token_hash`),
  ADD KEY `idx_sessions_account` (`account_id`),
  ADD KEY `idx_sessions_expires` (`expires_at`),
  ADD KEY `idx_sessions_revoked` (`revoked_at`),
  ADD KEY `idx_sessions_last_activity` (`last_activity`),
  ADD KEY `idx_sessions_token_revoked` (`token_hash`,`revoked_at`,`expires_at`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT per la tabella `account_activity`
--
ALTER TABLE `account_activity`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT per la tabella `account_oauth_pending`
--
ALTER TABLE `account_oauth_pending`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT per la tabella `account_password_resets`
--
ALTER TABLE `account_password_resets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT per la tabella `account_sessions`
--
ALTER TABLE `account_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `account_activity`
--
ALTER TABLE `account_activity`
  ADD CONSTRAINT `activity_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `account_email_verifications`
--
ALTER TABLE `account_email_verifications`
  ADD CONSTRAINT `email_verifications_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `account_password_resets`
--
ALTER TABLE `account_password_resets`
  ADD CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `account_sessions`
--
ALTER TABLE `account_sessions`
  ADD CONSTRAINT `fk_sessions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
