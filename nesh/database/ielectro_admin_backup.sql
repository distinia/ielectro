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
-- Database: `ielectro_admin`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `careers`
--

CREATE TABLE `careers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `location` varchar(180) DEFAULT NULL,
  `employment_type` varchar(64) NOT NULL DEFAULT 'full_time',
  `description` text NOT NULL,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requirements`)),
  `status` enum('active','hidden') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `careers`
--

INSERT INTO `careers` (`id`, `title`, `location`, `employment_type`, `description`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Software Engineer', NULL, 'full_time', 'c++\nc#\njs', '[\"c++\",\"c#\",\"js\"]', 'active', '2026-08-12 13:22:13', '2026-08-12 13:22:13'),
(2, 'Data Analyst', NULL, 'full_time', 'ms access', '[\"ms access\"]', 'active', '2026-08-12 13:22:54', '2026-08-12 13:22:54');

-- --------------------------------------------------------

--
-- Struttura della tabella `career_applications`
--

CREATE TABLE `career_applications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `full_name` varchar(160) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(32) DEFAULT NULL,
  `position` varchar(180) NOT NULL,
  `cv_file` varchar(255) DEFAULT NULL,
  `status` enum('reviewing','accepted','rejected') NOT NULL DEFAULT 'reviewing',
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `career_applications`
--

INSERT INTO `career_applications` (`id`, `uuid`, `full_name`, `email`, `phone_number`, `position`, `cv_file`, `status`, `reviewed_by`, `reviewed_at`, `created_at`) VALUES
(1, '93b85680-961b-4b15-83e0-f73b7640c959', 'Jennifer', 'distiniaa@gmail.com', NULL, 'Software Engineer', '93b85680-961b-4b15-83e0-f73b7640c959.pdf', 'reviewing', NULL, NULL, '2026-08-12 15:15:37');

-- --------------------------------------------------------

--
-- Struttura della tabella `news`
--

CREATE TABLE `news` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `author_id` bigint(20) UNSIGNED DEFAULT NULL,
  `uuid` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `excerpt` text DEFAULT NULL,
  `body` longtext NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `status` enum('draft','published','hidden') NOT NULL DEFAULT 'published',
  `published_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `news`
--

INSERT INTO `news` (`id`, `author_id`, `uuid`, `title`, `excerpt`, `body`, `image`, `status`, `published_at`, `updated_at`) VALUES
(7, 1, '28f6257e-da03-4c4f-81eb-9c2269b534c0', 'Dyscover 1.0.0', NULL, 'Dyscover 1.0.0 Dyscover 1.0.0 Dyscover 1.0.0', '28f6257e-da03-4c4f-81eb-9c2269b534c0.png', 'published', '2026-08-12 14:19:21', '2026-08-12 14:19:21'),
(10, 1, '12b5c206-9880-4fa9-9d81-7f133226815f', 'Dyscover', NULL, '1. Nella prima foto: non usare il testo, ma le icone\r\n\r\n2. elimina sto coso dal URL ?action=edit&id=1, e anche il pulsante per tornare indietro\r\n\r\n3. quando premo il view appare un box con le infos\r\n\r\n4. quando voglio creare o editare appare un box\r\n\r\n5. nella seconda foto, migliora lo stile dei popup \r\n\r\n6. QUANDO CARICO I NEWS MI FA \"unable to load\"', '12b5c206-9880-4fa9-9d81-7f133226815f.png', 'published', '2026-08-12 14:25:51', '2026-08-12 14:25:51');

-- --------------------------------------------------------

--
-- Struttura della tabella `rate_limits`
--

CREATE TABLE `rate_limits` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `scope_key` varchar(128) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempts` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `window_start` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `rate_limits`
--

INSERT INTO `rate_limits` (`id`, `scope_key`, `ip_address`, `attempts`, `window_start`, `expires_at`, `updated_at`) VALUES
(1, 'login', '127.0.0.1', 1, '2026-08-08 14:25:43', '2026-08-08 14:40:43', '2026-08-08 12:25:43'),
(2, 'login:account', 'a:2ed1192855a3f6ff93134058830eb0ee6f3c239a97f', 1, '2026-08-08 14:25:43', '2026-08-08 14:40:43', '2026-08-08 12:25:43'),
(3, 'password_recovery', '127.0.0.1', 5, '2026-08-08 19:28:22', '2026-08-08 19:43:22', '2026-08-08 17:39:36'),
(4, 'career_apply', '127.0.0.1', 1, '2026-08-12 17:15:37', '2026-08-12 17:30:37', '2026-08-12 15:15:37'),
(5, 'www:page-view', '127.0.0.1', 3, '2026-08-23 14:35:57', '2026-08-23 14:36:57', '2026-08-23 12:36:14'),
(6, 'www:stats', '127.0.0.1', 2, '2026-08-23 14:35:57', '2026-08-23 14:36:57', '2026-08-23 12:36:14'),
(7, 'www:stats', '', 2, '2026-08-23 14:34:08', '2026-08-23 14:35:08', '2026-08-23 12:34:47');

-- --------------------------------------------------------

--
-- Struttura della tabella `team`
--

CREATE TABLE `team` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `account_id` bigint(20) UNSIGNED DEFAULT NULL,
  `role_text` varchar(180) NOT NULL,
  `linkedin` varchar(255) DEFAULT NULL,
  `github` varchar(255) DEFAULT NULL,
  `status` enum('active','hidden') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `team`
--

INSERT INTO `team` (`id`, `uuid`, `account_id`, `role_text`, `linkedin`, `github`, `status`, `created_at`, `updated_at`) VALUES
(6, '344434d2-c1bc-4d3d-b26a-4e30ffc2b784', 2, 'CEO & Software Engineer', 'distinia', 'distinia', 'active', '2026-08-12 13:36:01', '2026-08-12 15:33:36');

-- --------------------------------------------------------

--
-- Struttura della tabella `www_page_views`
--

CREATE TABLE `www_page_views` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `www_page_views`
--

INSERT INTO `www_page_views` (`id`, `path`, `created_at`) VALUES
(1, '/', '2026-08-13 13:23:45'),
(2, '/', '2026-08-14 19:45:35'),
(3, '/', '2026-08-14 19:49:01'),
(4, '/services', '2026-08-14 19:50:06'),
(5, '/team', '2026-08-14 19:50:19'),
(6, '/careers', '2026-08-14 19:50:30'),
(7, '/news', '2026-08-14 19:50:47'),
(8, '/contact-us', '2026-08-14 19:50:53'),
(9, '/services', '2026-08-14 19:50:59'),
(10, '/services', '2026-08-14 19:51:12'),
(11, '/contact-us', '2026-08-14 19:51:23'),
(12, '/news', '2026-08-14 19:52:37'),
(13, '/team', '2026-08-14 19:52:39'),
(14, '/contact-us', '2026-08-14 19:53:36'),
(15, '/', '2026-08-14 19:55:36'),
(16, '/', '2026-08-14 19:55:49'),
(17, '/', '2026-08-14 19:55:56'),
(18, '/', '2026-08-14 19:57:30'),
(19, '/services', '2026-08-14 19:57:46'),
(20, '/team', '2026-08-14 19:57:53'),
(21, '/careers', '2026-08-14 19:58:02'),
(22, '/news', '2026-08-14 19:58:08'),
(23, '/', '2026-08-14 20:00:11'),
(24, '/', '2026-08-14 20:00:24'),
(25, '/team', '2026-08-14 20:02:29'),
(26, '/news', '2026-08-14 20:02:31'),
(27, '/careers', '2026-08-14 20:02:36'),
(28, '/services', '2026-08-14 20:02:45'),
(29, '/services', '2026-08-14 20:03:13'),
(30, '/careers', '2026-08-14 20:03:16'),
(31, '/', '2026-08-14 20:03:19'),
(32, '/services', '2026-08-14 20:03:29'),
(33, '/services', '2026-08-14 20:16:23'),
(34, '/services', '2026-08-14 20:16:51'),
(35, '/team', '2026-08-14 20:16:58'),
(36, '/news', '2026-08-14 20:17:00'),
(37, '/careers', '2026-08-14 20:17:05'),
(38, '/news', '2026-08-14 20:17:07'),
(39, '/services', '2026-08-14 20:17:13'),
(40, '/team', '2026-08-14 20:17:14'),
(41, '/', '2026-08-14 20:17:16'),
(42, '/', '2026-08-14 20:18:30'),
(43, '/services', '2026-08-14 20:18:45'),
(44, '/', '2026-08-14 20:18:52'),
(45, '/', '2026-08-14 20:18:58'),
(46, '/news', '2026-08-14 20:19:31'),
(47, '/news', '2026-08-14 20:20:29'),
(48, '/news', '2026-08-14 20:20:43'),
(49, '/', '2026-08-14 20:24:39'),
(50, '/', '2026-08-14 20:24:55'),
(51, '/', '2026-08-14 20:25:25'),
(52, '/', '2026-08-14 20:31:24'),
(53, '/services', '2026-08-14 20:31:26'),
(54, '/team', '2026-08-14 20:31:28'),
(55, '/careers', '2026-08-14 20:31:29'),
(56, '/news', '2026-08-14 20:31:30'),
(57, '/news', '2026-08-14 21:02:10'),
(58, '/', '2026-08-23 12:30:27'),
(59, '/', '2026-08-23 12:30:48'),
(60, '/services', '2026-08-23 12:30:52'),
(61, '/team', '2026-08-23 12:30:54'),
(62, '/careers', '2026-08-23 12:30:55'),
(63, '/news', '2026-08-23 12:30:57'),
(64, '/', '2026-08-23 12:33:23'),
(65, '/careers', '2026-08-23 12:33:55'),
(66, '/news', '2026-08-23 12:33:57'),
(67, '/services', '2026-08-23 12:34:07'),
(68, '/', '2026-08-23 12:35:57'),
(69, '/services', '2026-08-23 12:36:10'),
(70, '/', '2026-08-23 12:36:14');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `careers`
--
ALTER TABLE `careers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_careers_status` (`status`),
  ADD KEY `idx_careers_created` (`created_at`);

--
-- Indici per le tabelle `career_applications`
--
ALTER TABLE `career_applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_career_applications_uuid` (`uuid`),
  ADD KEY `idx_career_applications_status` (`status`),
  ADD KEY `idx_career_applications_reviewed_by` (`reviewed_by`),
  ADD KEY `idx_career_applications_created` (`created_at`);

--
-- Indici per le tabelle `news`
--
ALTER TABLE `news`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_news_uuid` (`uuid`),
  ADD KEY `idx_news_author` (`author_id`),
  ADD KEY `idx_news_status` (`status`),
  ADD KEY `idx_news_published` (`published_at`);
ALTER TABLE `news` ADD FULLTEXT KEY `ft_news_search` (`title`,`excerpt`,`body`);

--
-- Indici per le tabelle `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rate_limit_scope_ip` (`scope_key`,`ip_address`),
  ADD KEY `idx_rate_limits_expires` (`expires_at`);

--
-- Indici per le tabelle `team`
--
ALTER TABLE `team`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_team_uuid` (`uuid`),
  ADD KEY `idx_team_status` (`status`),
  ADD KEY `idx_team_account` (`account_id`);

--
-- Indici per le tabelle `www_page_views`
--
ALTER TABLE `www_page_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_www_page_views_path` (`path`),
  ADD KEY `idx_www_page_views_created` (`created_at`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `careers`
--
ALTER TABLE `careers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT per la tabella `career_applications`
--
ALTER TABLE `career_applications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT per la tabella `news`
--
ALTER TABLE `news`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT per la tabella `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT per la tabella `team`
--
ALTER TABLE `team`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT per la tabella `www_page_views`
--
ALTER TABLE `www_page_views`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
