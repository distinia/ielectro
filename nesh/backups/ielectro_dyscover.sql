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
-- Database: `ielectro_dyscover`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_activity`
--

CREATE TABLE `dyscover_activity` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `recipient_id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED NOT NULL,
  `post_id` bigint(20) UNSIGNED DEFAULT NULL,
  `group_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` enum('like','comment','follow','share','message','mention') NOT NULL,
  `message` text DEFAULT NULL,
  `viewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_activity`
--

INSERT INTO `dyscover_activity` (`id`, `recipient_id`, `actor_id`, `post_id`, `group_id`, `type`, `message`, `viewed_at`, `created_at`) VALUES
(4, 2, 1, NULL, NULL, 'follow', NULL, '2026-08-09 20:37:06', '2026-08-09 18:36:28'),
(5, 1, 2, NULL, NULL, 'follow', NULL, '2026-08-09 22:01:16', '2026-08-09 19:00:51');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_banned_terms`
--

CREATE TABLE `dyscover_banned_terms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `term` varchar(100) NOT NULL,
  `match_type` enum('exact','contains','word') NOT NULL DEFAULT 'contains',
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_follows`
--

CREATE TABLE `dyscover_follows` (
  `follower_id` bigint(20) UNSIGNED NOT NULL,
  `followed_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_follows`
--

INSERT INTO `dyscover_follows` (`follower_id`, `followed_id`, `created_at`) VALUES
(1, 2, '2026-08-09 18:36:28'),
(2, 1, '2026-08-09 19:00:51');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_groups`
--

CREATE TABLE `dyscover_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `visibility` enum('private','public') DEFAULT 'private',
  `creator_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_group_members`
--

CREATE TABLE `dyscover_group_members` (
  `group_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('owner','admin','moderator','member') DEFAULT 'member',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_inbox_chats`
--

CREATE TABLE `dyscover_inbox_chats` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('direct','group') NOT NULL DEFAULT 'direct',
  `group_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_inbox_members`
--

CREATE TABLE `dyscover_inbox_members` (
  `chat_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_inbox_messages`
--

CREATE TABLE `dyscover_inbox_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `chat_id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `reply_to_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` enum('text','image','video','audio','file','post') DEFAULT 'text',
  `body` text DEFAULT NULL,
  `attachment` text DEFAULT NULL,
  `redacted` tinyint(1) NOT NULL DEFAULT 0,
  `post_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_inbox_message_hides`
--

CREATE TABLE `dyscover_inbox_message_hides` (
  `message_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `hidden_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_inbox_message_reads`
--

CREATE TABLE `dyscover_inbox_message_reads` (
  `message_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_posts`
--

CREATE TABLE `dyscover_posts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `type` enum('article','image','video','audio','document','template') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `extension` varchar(10) DEFAULT NULL,
  `preview_image` varchar(255) DEFAULT NULL,
  `visibility` enum('public','private','unlisted') DEFAULT 'public',
  `allow_comments` tinyint(1) DEFAULT 1,
  `allow_shares` tinyint(1) DEFAULT 1,
  `status` enum('active','hidden','removed') NOT NULL DEFAULT 'active',
  `published_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_posts`
--

INSERT INTO `dyscover_posts` (`id`, `user_id`, `uuid`, `type`, `title`, `description`, `extension`, `preview_image`, `visibility`, `allow_comments`, `allow_shares`, `status`, `published_at`, `updated_at`) VALUES
(18, 2, 'abf53e54-c691-4179-b88c-a5aa78b26384', 'article', 'Agaritia', 'Agaritia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/b4d441a2-472b-486d-9fff-09b54744eec2.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(19, 2, '4769492f-1cb7-46a2-a672-46faad36c4d5', 'article', 'Alveria', 'Alveria', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/bb40c9e4-f6a9-4f82-b5c5-79936a2d616f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(20, 2, '01a8298b-b8ec-439a-9427-120574f9c799', 'article', 'Azaria', 'Azaria', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/3f86dcce-8666-456b-83de-ad418aa2aa19.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(21, 2, 'c495b33e-1b72-46b1-9e6a-d15048f282ee', 'article', 'Boravia', 'Boravia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/f1a951f8-53e2-42fb-903e-32ba7224083b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(22, 2, 'f74e324a-625e-4778-a95c-1476ed447b4e', 'article', 'Cavallesia', 'Cavallesia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/7b5d7f58-672e-4695-80b2-5679c20a279d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(23, 2, '9a531f54-ab5e-4eae-b6b3-1ea7f87b172b', 'article', 'Comussania', 'Comussania', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/8943f459-ce65-4a57-9f13-9bd03f1b84e3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(24, 2, 'ae8456f9-4596-4307-9ddc-6d364dc417e7', 'article', 'Cusea', 'Cusea', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/6231b957-784e-40cd-aad4-e38cc69e9b30.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(25, 2, 'fd35f695-0503-453e-b315-38fc18ec84bf', 'article', 'Destenia', 'Destenia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/055b7fa6-9d59-465d-85ba-9344f87e995e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(26, 2, '504ab472-8d25-407a-9165-0384e1a4f4e2', 'article', 'Destenian Armed Forces', 'Destenian Armed Forces', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/c55b8552-00d7-4e6c-a8b1-d2a8da6b53b3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-26 13:05:25'),
(27, 2, '7bc6be6b-edd5-40ab-a05a-71e787508369', 'article', 'Destiny Omagu', 'Destiny Omagu', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/3edefdc0-e4b6-41b7-94ac-d3ba4b977364.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-26 11:14:21'),
(28, 2, '0eb7db45-a620-4a87-8f01-75ae145b013c', 'article', 'Edrobean Community', 'Edrobean Community', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/9a874ca6-aa92-4523-8415-b4915f54b4ac.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(29, 2, '43c76346-df49-4d4a-89c7-83578bb911cb', 'article', 'Fesia', 'Fesia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/2e7e4cf6-1daf-4537-944a-58d04bee2680.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(30, 2, 'b5e284d0-e1a7-4562-ab6f-2b867e30e9d0', 'article', 'Jarnovia', 'Jarnovia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/62df94ff-49cf-4370-91cb-874177ae49f8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(31, 2, 'e8df1768-84d6-45c0-bf64-0ba7191173ab', 'article', 'Kashiria', 'Kashiria', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/780ac7b8-d181-46a9-8c34-f62d09fe3c83.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(32, 2, '31b9963c-da3f-447a-85a4-110531fc7670', 'article', 'Lamberia', 'Lamberia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/6cfc803d-d245-43ce-82f1-66f0f6809bf4.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(33, 2, '2e62c869-6b5e-4ef5-859a-14b1aaf1be48', 'article', 'Laocitia', 'Laocitia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/1fc0e8bd-07b8-4351-9788-12ade103b630.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(35, 2, '606ef495-2ac8-4826-b603-0d049cdb1a27', 'article', 'Metosia', 'Metosia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/4c5cf993-29c7-432a-ae19-9a9f45ec7226.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(37, 2, 'e8718c83-6511-4dfa-adf9-7c3770da22cc', 'article', 'Politics of Destenia', 'Politics of Destenia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/289adac7-61a4-4173-a25b-7835956fbd31.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(38, 2, '27f19d20-6045-4acd-8698-d87bcfde4595', 'article', 'Revolutionaries', 'Revolutionaries', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/38649a5a-7150-4e1f-b6ac-f178e9600dec.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(39, 2, 'e7fda177-000a-489a-bfdc-97511f873657', 'article', 'Ricene', 'Ricene', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/6d6ce66b-2fc2-421c-a903-084c546acc4e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(40, 2, 'fa7970c0-6b95-49b2-8337-fc1745edc99d', 'article', 'Sifalam', 'Sifalam', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/1749ff42-f322-463e-bd19-b19d52d68fa5.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(42, 2, 'b063ebd8-fa62-4513-af21-f465190b5c85', 'article', 'Stasia', 'Stasia', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/a9afa436-1f88-49c0-bd03-8fa5f094d986.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(43, 2, '445b34be-a2bb-427a-9061-9e55a50cb5ca', 'article', 'Suklan', 'Suklan', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/8673317f-326a-4bce-8f36-f5e4b21b6992.png', 'public', 1, 1, 'active', '2026-08-10 12:20:34', '2026-08-10 20:29:38'),
(44, 2, 'ca7d8745-e782-410d-a2b1-bc9f728c1029', 'article', 'Tayanusan Community', 'Tayanusan Community', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/82c487c8-7ebe-4f87-8300-cad89bf6e90c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 20:29:38'),
(46, 2, '9152da78-f7a6-4634-89a1-3bf506e1ca7a', 'article', 'Valmirica', 'Valmirica', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/b873f856-afda-4729-a2b6-7a5eece0cf0e.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 20:29:38'),
(47, 2, 'a250b5e6-664a-45af-8921-bb68b37283ab', 'article', 'Verdania', 'Verdania', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/d602e325-e3ac-4a73-901a-96d4bae38dbf.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 20:29:38'),
(48, 2, '44c29848-9da3-481c-a8b0-d831318ed1c8', 'article', 'United Nations', 'The United Nations is an international organization that brings together nations across the world to promote cooperation, maintain peace, and coordinate political, economic, and diplomatic affairs between its member states', 'html', 'https://dyscover.ielectro.com/assets/users/2/images/da00ba9e-c8ef-4921-9176-e4253109994d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-15 00:17:55'),
(51, 2, '9fdc8c66-e626-4cc8-970a-b7417a6e214c', 'image', 'Chairman of the Edrobean Commission', 'Chairman of the Edrobean Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9fdc8c66-e626-4cc8-970a-b7417a6e214c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-31 21:29:16'),
(52, 2, '5b4a7902-8337-420f-8441-606b7eb5ee7f', 'image', 'Chairman of the Edrobean Council of Citizens', 'Chairman of the Edrobean Council of Citizens', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/5b4a7902-8337-420f-8441-606b7eb5ee7f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(53, 2, 'dd672e09-b76f-4df3-a480-0d8ec091af89', 'image', 'Chairman of the Edrobean Assembly', 'Chairman of the Edrobean Assembly', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/dd672e09-b76f-4df3-a480-0d8ec091af89.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-30 21:40:15'),
(55, 2, 'c0fa819f-1455-4bf5-8ee3-bc8a45064f7f', 'image', 'Chief Justice of Destenia', 'Chief Justice of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c0fa819f-1455-4bf5-8ee3-bc8a45064f7f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(56, 2, '45bd1528-d655-4b5f-9281-3eafbb8f2cde', 'image', 'Chief of the Destenian Armed Forces', 'Chief of the Destenian Armed Forces', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/45bd1528-d655-4b5f-9281-3eafbb8f2cde.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(57, 2, '583d817c-adbb-4f5c-ba19-0f8d6eb85a48', 'image', 'Chief of the Destenian Criminal Police', 'Chief of the Destenian Criminal Police', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/583d817c-adbb-4f5c-ba19-0f8d6eb85a48.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(58, 2, '3c1a3ba0-520a-42ba-abd6-1b93571d8340', 'image', 'Chief of the Destenian Financial Police', 'Chief of the Destenian Financial Police', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3c1a3ba0-520a-42ba-abd6-1b93571d8340.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(59, 2, '30ba383b-7185-44d3-b798-df00c87b1ab8', 'image', 'Chief of the Destenian National Guard', 'Chief of the Destenian National Guard', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/30ba383b-7185-44d3-b798-df00c87b1ab8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(60, 2, 'd28e1554-c943-46d9-81fd-6999c59f83a7', 'image', 'Chief of the Destenian Prison Police', 'Chief of the Destenian Prison Police', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d28e1554-c943-46d9-81fd-6999c59f83a7.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(61, 2, '6262cc36-5d86-4474-8dd2-3148129fd88f', 'image', 'Chief of the Destenian State Police', 'Chief of the Destenian State Police', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6262cc36-5d86-4474-8dd2-3148129fd88f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(62, 2, '99ff249c-1fac-44cc-b6bd-39fa8ba91cd8', 'image', 'City of Marpoli', 'City of Marpoli', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/99ff249c-1fac-44cc-b6bd-39fa8ba91cd8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(63, 2, 'e20fe91b-6652-4560-821e-c9b58cc46fee', 'image', 'Commander in Chief of the Destenian Air Force', 'Commander in Chief of the Destenian Air Force', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e20fe91b-6652-4560-821e-c9b58cc46fee.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(64, 2, 'edea0bc3-02b3-4eb4-aee9-8886aad1b124', 'image', 'Commander in Chief of the Destenian Army', 'Commander in Chief of the Destenian Army', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/edea0bc3-02b3-4eb4-aee9-8886aad1b124.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(65, 2, 'ffa56298-f968-4b09-8448-b2bb6a53c765', 'image', 'Commander in Chief the Destenian Navy', 'Commander in Chief the Destenian Navy', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ffa56298-f968-4b09-8448-b2bb6a53c765.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(66, 2, '65b7cc38-a91b-4675-bbac-7727b8defa42', 'image', 'Commander of the Destenian Coast Guard', 'Commander of the Destenian Coast Guard', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/65b7cc38-a91b-4675-bbac-7727b8defa42.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(67, 2, '99767a24-0a25-484f-a3a1-7186b3af7c6e', 'image', 'Comussan Jarnovian Railway', 'Comussan Jarnovian Railway', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/99767a24-0a25-484f-a3a1-7186b3af7c6e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-24 22:44:40'),
(68, 2, '38649a5a-7150-4e1f-b6ac-f178e9600dec', 'image', 'Congress of the Revolutionaries', 'Congress of the Revolutionaries', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/38649a5a-7150-4e1f-b6ac-f178e9600dec.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(69, 2, '1e13b850-65d4-4e84-91c6-1b9e2f63e5d2', 'image', 'Countries names', 'Countries names', 'jpeg', 'https://dyscover.ielectro.com/assets/users/2/images/1e13b850-65d4-4e84-91c6-1b9e2f63e5d2.jpeg', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(70, 2, '414c674b-1d0c-4e3f-b1b6-d86029ab0645', 'image', 'Democracy Index', 'Democracy Index', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/414c674b-1d0c-4e3f-b1b6-d86029ab0645.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(71, 2, '2aea7c73-3a2e-4d76-b4bc-fe8b2b3610b4', 'image', 'Deputy Secretary General of the Edrobean Community', 'Deputy Secretary General of the Edrobean Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/2aea7c73-3a2e-4d76-b4bc-fe8b2b3610b4.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(73, 2, '71a07786-2675-4be6-845a-687641fe736b', 'image', 'Destenians', 'Destenians', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/71a07786-2675-4be6-845a-687641fe736b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(74, 2, '0e412b96-cb6d-44b2-83b7-687df8226070', 'image', 'Destenian airmen', 'Destenian airmen', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0e412b96-cb6d-44b2-83b7-687df8226070.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(75, 2, 'b31d6305-ec1e-40e2-9ba7-8708b56084aa', 'image', 'Destenian Air Force Flag', 'Destenian Air Force Flag', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b31d6305-ec1e-40e2-9ba7-8708b56084aa.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(76, 2, '0c8cb36f-3c97-4c3c-8225-be74d9a87d9b', 'image', 'Destenian Army Flag', 'Destenian Army Flag', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0c8cb36f-3c97-4c3c-8225-be74d9a87d9b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(77, 2, '4bd2083b-a9a0-47dc-8214-4ce35f49ec45', 'image', 'Destenian army training', 'Destenian army training', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4bd2083b-a9a0-47dc-8214-4ce35f49ec45.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(78, 2, 'e7fef139-739a-4af9-b386-d4ff9c898784', 'image', 'Destenian Cabinet meeting', 'Destenian Cabinet meeting', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e7fef139-739a-4af9-b386-d4ff9c898784.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(79, 2, '82618d0c-e78a-427f-9571-06c113284189', 'image', 'Destenian Chamber Speaker', 'Destenian Chamber Speaker', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/82618d0c-e78a-427f-9571-06c113284189.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(80, 2, 'c92140d1-ffe0-4ec1-b54d-b03392c5d7d1', 'image', 'Destenian court', 'Destenian court', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c92140d1-ffe0-4ec1-b54d-b03392c5d7d1.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(81, 2, '440e7638-177c-498a-8eb8-dea2abb8c2cc', 'image', 'Destenian Cusea relations', 'Destenian Cusea relations', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/440e7638-177c-498a-8eb8-dea2abb8c2cc.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(82, 2, '1718d430-1ffe-49d9-9633-55c0834768b4', 'image', 'Destenian elections', 'Destenian elections', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/1718d430-1ffe-49d9-9633-55c0834768b4.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(83, 2, '0989c3d7-5047-4cf6-84d9-c119cae002ea', 'image', 'Destenian fleet', 'Destenian fleet', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0989c3d7-5047-4cf6-84d9-c119cae002ea.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(84, 2, 'd8b82588-8017-43b5-aafc-8015805f1301', 'image', 'Destenian football team', 'Destenian football team', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d8b82588-8017-43b5-aafc-8015805f1301.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(85, 2, '289adac7-61a4-4173-a25b-7835956fbd31', 'image', 'Destenian government', 'Destenian government', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/289adac7-61a4-4173-a25b-7835956fbd31.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(86, 2, 'dda49d70-bd18-4796-80af-329af1f78f2e', 'image', 'Destenian ICBM', 'Destenian ICBM', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/dda49d70-bd18-4796-80af-329af1f78f2e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(87, 2, '3a6f2b41-bacc-46b8-938f-2d4cda8dfe78', 'image', 'Destenian military', 'Destenian military', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3a6f2b41-bacc-46b8-938f-2d4cda8dfe78.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(88, 2, '8475a4d4-fb3e-4bf4-bf95-fd02d9250e2b', 'image', 'Destenian military budget', 'Destenian military budget', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8475a4d4-fb3e-4bf4-bf95-fd02d9250e2b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(90, 2, '1150fb7b-8b73-4b4f-ad92-bc8f1c3bb663', 'image', 'Destenian Navy Flag', 'Destenian Navy Flag', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/1150fb7b-8b73-4b4f-ad92-bc8f1c3bb663.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(91, 2, '3fda5de4-832e-4efc-a752-adcabad9530a', 'image', 'Destenian Police formation', 'Destenian Police formation', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3fda5de4-832e-4efc-a752-adcabad9530a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(92, 2, 'bee4646a-0f2c-495d-91f9-eaa319ba69bc', 'image', 'Destenian Premiership Seal', 'Destenian Premiership Seal', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/bee4646a-0f2c-495d-91f9-eaa319ba69bc.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(93, 2, '85264f6b-8936-4e91-aa9d-28c0612ae973', 'image', 'Destenian Presidential Seal', 'Destenian Presidential Seal', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/85264f6b-8936-4e91-aa9d-28c0612ae973.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(94, 2, '6bc3bbeb-c59e-45f5-82d2-e60d51562dea', 'image', 'Destenian Rien', 'Destenian Rien', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6bc3bbeb-c59e-45f5-82d2-e60d51562dea.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(95, 2, '156663e9-9900-4b9d-bcbc-8ae90152c9d0', 'image', 'Destenian Senate Speaker', 'Destenian Senate Speaker', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/156663e9-9900-4b9d-bcbc-8ae90152c9d0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(96, 2, '265bf182-10f3-42d6-ac35-725008fe0cc7', 'image', 'Destiny Omagu meeting soldiers', 'Destiny Omagu meeting soldiers', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/265bf182-10f3-42d6-ac35-725008fe0cc7.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(97, 2, '449d8c47-c4b6-43dc-acf6-576b1afa3b25', 'image', 'Director of The Vanguard', 'Director of The Vanguard, the Revolutionaries Media', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/449d8c47-c4b6-43dc-acf6-576b1afa3b25.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-09-03 23:26:26'),
(98, 2, '0b0f7ed9-c00c-4ca1-bd39-81e24426c7e0', 'image', 'Director of the Destenian Intelligence Agency', 'Director of the Destenian Intelligence Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0b0f7ed9-c00c-4ca1-bd39-81e24426c7e0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(99, 2, '9a0bc76c-c11b-4d55-b9df-e8cf0d86b242', 'image', 'Director of the Destenian NSA', 'Director of the Destenian NSA', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9a0bc76c-c11b-4d55-b9df-e8cf0d86b242.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(101, 2, 'c3fcda30-1e17-4b80-974c-6f5411924d56', 'image', 'Edrobean Commissioner of Defence', 'Edrobean Commissioner of Defence', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c3fcda30-1e17-4b80-974c-6f5411924d56.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(102, 2, '08e62509-16d6-4167-a72c-eb1204a8eb70', 'image', 'Edrobean Commissioner of Energy & Resources', 'Edrobean Commissioner of Energy & Resources', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/08e62509-16d6-4167-a72c-eb1204a8eb70.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-30 21:56:31'),
(103, 2, '9b7d9edf-da77-4677-a9ae-4f4b69b45aa8', 'image', 'Edrobean Commissioner of Environment', 'Edrobean Commissioner of Environment', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9b7d9edf-da77-4677-a9ae-4f4b69b45aa8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(104, 2, '26acf39a-8766-420f-8d6f-aff737db7851', 'image', 'Edrobean Commissioner of Health', 'Edrobean Commissioner of Health', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/26acf39a-8766-420f-8d6f-aff737db7851.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(105, 2, 'f51ffd78-5e85-4077-bed4-6b8bbaf26492', 'image', 'Edrobean Commissioner of Infrastructure', 'Edrobean Commissioner of Infrastructure', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f51ffd78-5e85-4077-bed4-6b8bbaf26492.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(106, 2, 'a8b66be1-45c9-4186-a8d0-db28f30fcaa5', 'image', 'Edrobean Commissioner of Justice', 'Edrobean Commissioner of Justice', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a8b66be1-45c9-4186-a8d0-db28f30fcaa5.png', 'public', 1, 1, 'active', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(107, 2, '8c94b711-2ad5-475c-8335-560a2c22c900', 'image', 'Edrobean Commissioner of Research and Space', 'Edrobean Commissioner of Research and Space', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8c94b711-2ad5-475c-8335-560a2c22c900.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(108, 2, 'f233da3c-9d86-44da-a1c5-23b6180c1046', 'image', 'Edrobean Commissioner of Culture & Social Affairs', 'Edrobean Commissioner of Culture & Social Affairs', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f233da3c-9d86-44da-a1c5-23b6180c1046.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-30 21:50:54'),
(109, 2, '57fa79ba-0c23-4cef-a0bf-5ca9c12098e9', 'image', 'Edrobean Commissioner of Telecommunications', 'Edrobean Commissioner of Telecommunications', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/57fa79ba-0c23-4cef-a0bf-5ca9c12098e9.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(110, 2, 'f1ea3eb2-fc79-4df3-a977-04efb7ad72f5', 'image', 'Edrobean Commissioner of Trade', 'Edrobean Commissioner of Trade', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f1ea3eb2-fc79-4df3-a977-04efb7ad72f5.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(112, 2, '45447e34-ae0e-42cb-88ea-a6a47eca9acf', 'image', 'Edrobean migration', 'Edrobean migration', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/45447e34-ae0e-42cb-88ea-a6a47eca9acf.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(113, 2, '297f3e94-eca0-484b-8e8f-2c3b600ab81d', 'image', 'Edrobean military training', 'Edrobean military training', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/297f3e94-eca0-484b-8e8f-2c3b600ab81d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(114, 2, 'a1d7873c-f937-4363-a9fe-8b65c2ca65bc', 'image', 'Emblem of Agaritia', 'Emblem of Agaritia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a1d7873c-f937-4363-a9fe-8b65c2ca65bc.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(115, 2, '6b54aff1-52c2-4efa-98e4-ae1afb707d33', 'image', 'Emblem of Alveria', 'Emblem of Alveria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6b54aff1-52c2-4efa-98e4-ae1afb707d33.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(116, 2, 'c47fa176-485b-4b9d-ac61-6cb189c85479', 'image', 'Emblem of Azaria', 'Emblem of Azaria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c47fa176-485b-4b9d-ac61-6cb189c85479.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(117, 2, 'b71ba4b8-4d5a-4100-b734-6d2985631260', 'image', 'Emblem of Boravia', 'Emblem of Boravia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b71ba4b8-4d5a-4100-b734-6d2985631260.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(118, 2, '96234994-dd7e-47a7-9077-b97798070f90', 'image', 'Emblem of Cavallesia', 'Emblem of Cavallesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/96234994-dd7e-47a7-9077-b97798070f90.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(119, 2, '4cb06e02-eecb-4553-812c-1557e7248ade', 'image', 'Emblem of Comussania', 'Emblem of Comussania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4cb06e02-eecb-4553-812c-1557e7248ade.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(120, 2, '7f0a68b1-c32b-45f6-b48f-99a60320246a', 'image', 'Emblem of Cusea', 'Emblem of Cusea', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7f0a68b1-c32b-45f6-b48f-99a60320246a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(121, 2, 'fb697144-f029-4e57-b14e-406de0e29acc', 'image', 'Emblem of Destenia', 'Emblem of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fb697144-f029-4e57-b14e-406de0e29acc.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(122, 2, 'b116c603-320e-461f-b1ea-ed7cc822287a', 'image', 'Emblem of Fesia', 'Emblem of Fesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b116c603-320e-461f-b1ea-ed7cc822287a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(123, 2, '8d99505a-2bd0-48f3-8b6d-9f1aa70aeb70', 'image', 'Emblem of Jarnovia', 'Emblem of Jarnovia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8d99505a-2bd0-48f3-8b6d-9f1aa70aeb70.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(124, 2, '7af5dcf3-905e-4a31-8517-8b28d1ab67ca', 'image', 'Emblem of Kashiria', 'Emblem of Kashiria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7af5dcf3-905e-4a31-8517-8b28d1ab67ca.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(125, 2, '8ffa0c12-9c08-4872-be07-f7490fa0cdc1', 'image', 'Emblem of Lamberia', 'Emblem of Lamberia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8ffa0c12-9c08-4872-be07-f7490fa0cdc1.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(126, 2, '083f9a41-5c38-43ba-9c2e-350e459fef23', 'image', 'Emblem of Laocitia', 'Emblem of Laocitia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/083f9a41-5c38-43ba-9c2e-350e459fef23.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(127, 2, '14823632-7ef4-4959-b200-85a8582e67c6', 'image', 'Emblem of Metosia', 'Emblem of Metosia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/14823632-7ef4-4959-b200-85a8582e67c6.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(128, 2, '0b65d488-7219-44c5-a81b-2e6d6ad081fd', 'image', 'Emblem of Ricene', 'Emblem of Ricene', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0b65d488-7219-44c5-a81b-2e6d6ad081fd.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(129, 2, 'd80542ff-af9d-44cb-8691-0f0a1c3d39b5', 'image', 'Emblem of Ricene', 'Emblem of Ricene', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d80542ff-af9d-44cb-8691-0f0a1c3d39b5.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-26 11:23:15'),
(130, 2, 'dd7b47b0-94c7-4f7d-8f28-dea918b5d95f', 'image', 'Emblem of Sifalam', 'Emblem of Sifalam', 'jpg', 'https://dyscover.ielectro.com/assets/users/2/images/dd7b47b0-94c7-4f7d-8f28-dea918b5d95f.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(131, 2, 'fcefeda9-bada-47da-9e2c-b0c22777a7b3', 'image', 'Emblem of Stasia', 'Emblem of Stasia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fcefeda9-bada-47da-9e2c-b0c22777a7b3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(132, 2, '7e13d8a1-67b3-43ef-ba83-6cc9ff14fd5e', 'image', 'Emblem of Suklan', 'Emblem of Suklan', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7e13d8a1-67b3-43ef-ba83-6cc9ff14fd5e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(133, 2, 'ef288773-568e-4144-ba56-54b19d94a18c', 'image', 'Emblem of the Destenian Armed Forces', 'Emblem of the Destenian Armed Forces', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ef288773-568e-4144-ba56-54b19d94a18c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(134, 2, 'cad72825-f906-4d6b-bbb1-fb876ada3878', 'image', 'Emblem of the Edrobean Community', 'Emblem of the Edrobean Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/cad72825-f906-4d6b-bbb1-fb876ada3878.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(135, 2, '2d54c6ba-6bfa-4e23-9efc-2ae4bb10376f', 'image', 'Emblem of the Kingdom of Destenia', 'Emblem of the Kingdom of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/2d54c6ba-6bfa-4e23-9efc-2ae4bb10376f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(136, 2, '8aad69ca-7a36-4c71-b6ce-6cc147f17700', 'image', 'Emblem of Valmirica', 'Emblem of Valmirica', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8aad69ca-7a36-4c71-b6ce-6cc147f17700.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(137, 2, '1c8d5149-b0f4-4678-94bb-9c7f04ab3eb6', 'image', 'Emblem of Verdania', 'Emblem of Verdania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/1c8d5149-b0f4-4678-94bb-9c7f04ab3eb6.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(140, 2, 'b4d441a2-472b-486d-9fff-09b54744eec2', 'image', 'Flag of Agaritia', 'Flag of Agaritia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b4d441a2-472b-486d-9fff-09b54744eec2.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(141, 2, 'bb40c9e4-f6a9-4f82-b5c5-79936a2d616f', 'image', 'Flag of Alveria', 'Flag of Alveria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/bb40c9e4-f6a9-4f82-b5c5-79936a2d616f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(142, 2, '3f86dcce-8666-456b-83de-ad418aa2aa19', 'image', 'Flag of Azaria', 'Flag of Azaria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3f86dcce-8666-456b-83de-ad418aa2aa19.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(143, 2, 'f1a951f8-53e2-42fb-903e-32ba7224083b', 'image', 'Flag of Boravia', 'Flag of Boravia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f1a951f8-53e2-42fb-903e-32ba7224083b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(144, 2, 'e0a61122-37dd-4982-b41e-fd26b68c1842', 'image', 'Flag of Cassitinia', 'Flag of Cassitinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e0a61122-37dd-4982-b41e-fd26b68c1842.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(145, 2, '7b5d7f58-672e-4695-80b2-5679c20a279d', 'image', 'Flag of Cavallesia', 'Flag of Cavallesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7b5d7f58-672e-4695-80b2-5679c20a279d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(146, 2, '8943f459-ce65-4a57-9f13-9bd03f1b84e3', 'image', 'Flag of Comussania', 'Flag of Comussania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8943f459-ce65-4a57-9f13-9bd03f1b84e3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(147, 2, '6231b957-784e-40cd-aad4-e38cc69e9b30', 'image', 'Flag of Cusea', 'Flag of Cusea', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6231b957-784e-40cd-aad4-e38cc69e9b30.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(148, 2, '055b7fa6-9d59-465d-85ba-9344f87e995e', 'image', 'Flag of Destenia', 'Flag of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/055b7fa6-9d59-465d-85ba-9344f87e995e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(149, 2, '588d0023-5a21-4ac1-9d07-2683bf1684a2', 'image', 'Flag of Desupia', 'Flag of Desupia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/588d0023-5a21-4ac1-9d07-2683bf1684a2.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(150, 2, '46ef314d-48d9-4bf9-a4f5-245d704a1390', 'image', 'Flag of Distinia', 'Flag of Distinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/46ef314d-48d9-4bf9-a4f5-245d704a1390.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(151, 2, '2e7e4cf6-1daf-4537-944a-58d04bee2680', 'image', 'Flag of Fesia', 'Flag of Fesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/2e7e4cf6-1daf-4537-944a-58d04bee2680.png', 'public', 1, 1, 'active', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(152, 2, '62df94ff-49cf-4370-91cb-874177ae49f8', 'image', 'Flag of Jarnovia', 'Flag of Jarnovia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/62df94ff-49cf-4370-91cb-874177ae49f8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(153, 2, '780ac7b8-d181-46a9-8c34-f62d09fe3c83', 'image', 'Flag of Kashiria', 'Flag of Kashiria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/780ac7b8-d181-46a9-8c34-f62d09fe3c83.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(154, 2, '6cfc803d-d245-43ce-82f1-66f0f6809bf4', 'image', 'Flag of Lamberia', 'Flag of Lamberia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6cfc803d-d245-43ce-82f1-66f0f6809bf4.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(155, 2, '1fc0e8bd-07b8-4351-9788-12ade103b630', 'image', 'Flag of Laocitia', 'Flag of Laocitia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/1fc0e8bd-07b8-4351-9788-12ade103b630.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(156, 2, 'ca03dc64-d077-4345-ac33-d9a629a97e49', 'image', 'Flag of Litorato', 'Flag of Litorato', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ca03dc64-d077-4345-ac33-d9a629a97e49.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(157, 2, '891ffbe4-88e5-4ca0-ab41-3989672fa4a3', 'image', 'Flag of Marporto', 'Flag of Marporto', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/891ffbe4-88e5-4ca0-ab41-3989672fa4a3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(158, 2, '4c5cf993-29c7-432a-ae19-9a9f45ec7226', 'image', 'Flag of Metosia', 'Flag of Metosia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4c5cf993-29c7-432a-ae19-9a9f45ec7226.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(159, 2, 'ba4c11dc-422a-4053-84b6-c93f452be2c0', 'image', 'Flag of Ostinia', 'Flag of Ostinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ba4c11dc-422a-4053-84b6-c93f452be2c0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(160, 2, '6d6ce66b-2fc2-421c-a903-084c546acc4e', 'image', 'Flag of Ricene', 'Flag of Ricene', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6d6ce66b-2fc2-421c-a903-084c546acc4e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(161, 2, '425c3bb6-3798-4b36-8f36-d587c3fe3687', 'image', 'Flag of Seritinia', 'Flag of Seritinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/425c3bb6-3798-4b36-8f36-d587c3fe3687.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(162, 2, '1749ff42-f322-463e-bd19-b19d52d68fa5', 'image', 'Flag of Sifalam', 'Flag of Sifalam', 'jpg', 'https://dyscover.ielectro.com/assets/users/2/images/1749ff42-f322-463e-bd19-b19d52d68fa5.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(163, 2, 'a9afa436-1f88-49c0-bd03-8fa5f094d986', 'image', 'Flag of Stasia', 'Flag of Stasia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a9afa436-1f88-49c0-bd03-8fa5f094d986.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(164, 2, '8673317f-326a-4bce-8f36-f5e4b21b6992', 'image', 'Flag of Suklan', 'Flag of Suklan', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8673317f-326a-4bce-8f36-f5e4b21b6992.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(165, 2, 'c55b8552-00d7-4e6c-a8b1-d2a8da6b53b3', 'image', 'Flag of the DAF', 'Flag of the Destenian Armed Forces', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c55b8552-00d7-4e6c-a8b1-d2a8da6b53b3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-14 23:17:07'),
(166, 2, '9a874ca6-aa92-4523-8415-b4915f54b4ac', 'image', 'Flag of the Edrobean Community', 'Flag of the Edrobean Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9a874ca6-aa92-4523-8415-b4915f54b4ac.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(167, 2, '82c487c8-7ebe-4f87-8300-cad89bf6e90c', 'image', 'Flag of the Tayanusan Community', 'Flag of the Tayanusan Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/82c487c8-7ebe-4f87-8300-cad89bf6e90c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(168, 2, 'da00ba9e-c8ef-4921-9176-e4253109994d', 'image', 'Flag of the United Nations', 'Flag of the United Nations', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/da00ba9e-c8ef-4921-9176-e4253109994d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-23 21:18:31'),
(169, 2, 'b873f856-afda-4729-a2b6-7a5eece0cf0e', 'image', 'Flag of Valmirica', 'Flag of Valmirica', 'jpg', 'https://dyscover.ielectro.com/assets/users/2/images/b873f856-afda-4729-a2b6-7a5eece0cf0e.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(170, 2, '907bf212-462b-499c-9284-83400d06017f', 'image', 'Flag of Valostia', 'Flag of Valostia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/907bf212-462b-499c-9284-83400d06017f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(171, 2, 'd602e325-e3ac-4a73-901a-96d4bae38dbf', 'image', 'Flag of Verdania', 'Flag of Verdania', 'jpg', 'https://dyscover.ielectro.com/assets/users/2/images/d602e325-e3ac-4a73-901a-96d4bae38dbf.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(172, 2, 'df1957f0-1d88-475c-8c44-9b7c0f12fd73', 'image', 'General Secretary of RVLZ', 'General Secretary of RVLZ', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/df1957f0-1d88-475c-8c44-9b7c0f12fd73.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(173, 2, 'fca3f212-b209-4ac3-b8a5-311d9129d5a1', 'image', 'General Secretary of WorkForward', 'General Secretary of WorkForward, the labour union of the Revolutionaries', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fca3f212-b209-4ac3-b8a5-311d9129d5a1.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-09-03 23:28:44'),
(174, 2, '5daff9cc-a170-4d5e-bd1b-dc46aa494671', 'image', 'Geo map of Destenia', 'Geo map of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/5daff9cc-a170-4d5e-bd1b-dc46aa494671.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(175, 2, '42fda3a8-a3b5-4469-bb3f-0a571ac86225', 'image', 'Geo map of Edrobe', 'Geo map of Edrobe', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/42fda3a8-a3b5-4469-bb3f-0a571ac86225.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(176, 2, '8e64f907-6731-4348-883b-412c94c50dbd', 'image', 'Geo map of the world', 'Geo map of the world', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8e64f907-6731-4348-883b-412c94c50dbd.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(177, 2, 'c4c594b9-43e9-4166-a3fd-67d795e8153a', 'image', 'Global political map', 'Global political map', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c4c594b9-43e9-4166-a3fd-67d795e8153a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(178, 2, 'cfdd4d02-8d99-4644-91a1-53da6d33fc68', 'image', 'Governor of Cassitinia', 'Governor of Cassitinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/cfdd4d02-8d99-4644-91a1-53da6d33fc68.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(179, 2, '6206e7e9-7b73-4a2c-919c-8566d03b7aaa', 'image', 'Governor of Desupia', 'Governor of Desupia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6206e7e9-7b73-4a2c-919c-8566d03b7aaa.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(180, 2, 'bae5a2a8-4260-4113-a2a1-be794cff370d', 'image', 'Governor of Litorato', 'Governor of Litorato', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/bae5a2a8-4260-4113-a2a1-be794cff370d.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(181, 2, 'fbe5f913-b2f9-452a-8935-d85775b7c8e8', 'image', 'Governor of Marporto', 'Governor of Marporto', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fbe5f913-b2f9-452a-8935-d85775b7c8e8.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(182, 2, '61e100ae-4393-4061-a99c-3820f12186ff', 'image', 'Governor of Ostinia', 'Governor of Ostinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/61e100ae-4393-4061-a99c-3820f12186ff.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(183, 2, '5a244ff6-296a-47e7-9e88-fa76d62af538', 'image', 'Governor of Seritinia', 'Governor of Seritinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/5a244ff6-296a-47e7-9e88-fa76d62af538.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(184, 2, '2c5394da-fa1b-4472-909a-79fc3ab8e22a', 'image', 'Governor of Valostia', 'Governor of Valostia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/2c5394da-fa1b-4472-909a-79fc3ab8e22a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(185, 2, 'c3dccfa4-01fc-4e3c-939e-ffe48615b501', 'image', 'Inspector General of Destenia', 'Inspector General of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c3dccfa4-01fc-4e3c-939e-ffe48615b501.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(186, 2, 'ced7449e-4677-4ee3-9c49-344b4730bda3', 'image', 'Leader of OneGeneration', 'Leader of OneGeneration', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ced7449e-4677-4ee3-9c49-344b4730bda3.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-09-03 23:23:51'),
(187, 2, '41609b14-bf3a-42d9-b55b-8bd51d298043', 'image', 'Logo of RVLZ', 'Logo of RVLZ, the political party of the Revolutionaries', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/41609b14-bf3a-42d9-b55b-8bd51d298043.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-09-05 18:05:43'),
(188, 2, '54917835-d600-41c0-92cb-53efca9d1395', 'image', 'Map of Agaritia', 'Map of Agaritia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/54917835-d600-41c0-92cb-53efca9d1395.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(189, 2, 'd9808330-adbb-4338-8f23-d40508b39ed1', 'image', 'Map of Alveria', 'Map of Alveria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d9808330-adbb-4338-8f23-d40508b39ed1.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(190, 2, '4b6f706c-a06c-4981-8015-38d55920537e', 'image', 'Map of Azaria', 'Map of Azaria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4b6f706c-a06c-4981-8015-38d55920537e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(191, 2, '084ccbec-d27a-4088-89a4-3d75c556c7ba', 'image', 'Map of Boravia', 'Map of Boravia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/084ccbec-d27a-4088-89a4-3d75c556c7ba.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(192, 2, 'ca9295c3-1414-49dc-a914-3002f37e21bf', 'image', 'Map of Cavallesia', 'Map of Cavallesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ca9295c3-1414-49dc-a914-3002f37e21bf.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(193, 2, '90208c1d-eaf4-43f3-8098-76b6eb21c28b', 'image', 'Map of Comussania', 'Map of Comussania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/90208c1d-eaf4-43f3-8098-76b6eb21c28b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(194, 2, 'f0195f09-fe78-45b0-8739-028dc0103cb1', 'image', 'Map of Cusea', 'Map of Cusea', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f0195f09-fe78-45b0-8739-028dc0103cb1.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(195, 2, '7444ca0d-636a-4ea5-bbdb-50e29f79d18b', 'image', 'Map of Destenia', 'Map of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7444ca0d-636a-4ea5-bbdb-50e29f79d18b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(196, 2, 'af2ee1b7-3aff-4dfe-b61e-4eca99fbe8ac', 'image', 'Map of Fesia', 'Map of Fesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/af2ee1b7-3aff-4dfe-b61e-4eca99fbe8ac.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(197, 2, 'fdf58a1c-62c1-4d70-a40b-51e5bdf4a11b', 'image', 'Map of Jarnovia', 'Map of Jarnovia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fdf58a1c-62c1-4d70-a40b-51e5bdf4a11b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(198, 2, '553658c7-182e-4fbc-93ef-23cebbdb8a07', 'image', 'Map of Kashiria', 'Map of Kashiria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/553658c7-182e-4fbc-93ef-23cebbdb8a07.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(199, 2, '27fa3df3-f830-4af6-b501-7657ca60aede', 'image', 'Map of Lamberia', 'Map of Lamberia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/27fa3df3-f830-4af6-b501-7657ca60aede.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(200, 2, '4d53b236-5ea9-416d-86b8-ebbb868c8e98', 'image', 'Map of Laocitia', 'Map of Laocitia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4d53b236-5ea9-416d-86b8-ebbb868c8e98.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(201, 2, '4ee0901c-1e71-45b5-a05f-74016fe8dec6', 'image', 'Map of Metosia', 'Map of Metosia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4ee0901c-1e71-45b5-a05f-74016fe8dec6.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(202, 2, '3dab1691-de46-48d4-ada5-71f6ac909bbb', 'image', 'Map of Ricene', 'Map of Ricene', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3dab1691-de46-48d4-ada5-71f6ac909bbb.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(203, 2, '9ccee7b9-5868-4ecd-b017-cc8ab5fdbaca', 'image', 'Map of Sifalam', 'Map of Sifalam', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9ccee7b9-5868-4ecd-b017-cc8ab5fdbaca.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(204, 2, '762c1370-bded-40ba-a180-4cb6b7051989', 'image', 'Map of Stasia', 'Map of Stasia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/762c1370-bded-40ba-a180-4cb6b7051989.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(205, 2, '95008520-d55a-47fe-9eaf-90595e107f95', 'image', 'Map of Suklan', 'Map of Suklan', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/95008520-d55a-47fe-9eaf-90595e107f95.png', 'public', 1, 1, 'active', '2026-08-10 12:20:37', '2026-08-10 12:20:38'),
(206, 2, 'f54607f0-c351-4162-966e-7afe9eb0a71c', 'image', 'Map of Tayanusan Community', 'Map of Tayanusan Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/f54607f0-c351-4162-966e-7afe9eb0a71c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38');
INSERT INTO `dyscover_posts` (`id`, `user_id`, `uuid`, `type`, `title`, `description`, `extension`, `preview_image`, `visibility`, `allow_comments`, `allow_shares`, `status`, `published_at`, `updated_at`) VALUES
(207, 2, '47b7bbb0-7c94-4622-b081-1dc586fbe85c', 'image', 'Map of the Edrobean Community', 'Map of the Edrobean Community', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/47b7bbb0-7c94-4622-b081-1dc586fbe85c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(208, 2, 'da1cab01-6dd0-4ea2-8260-92e2b97d5113', 'image', 'Map of Valmirica', 'Map of Valmirica', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/da1cab01-6dd0-4ea2-8260-92e2b97d5113.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(209, 2, '0552e496-4777-4cd9-af20-b62cc861f51f', 'image', 'Map of Verdania', 'Map of Verdania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0552e496-4777-4cd9-af20-b62cc861f51f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(211, 2, '94ddf690-3d9c-4257-ae2b-a6dcecf505de', 'image', 'Military Academy of Destenia', 'Military Academy of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/94ddf690-3d9c-4257-ae2b-a6dcecf505de.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(212, 2, '42269124-fdea-4cff-96be-f7c56209c15c', 'image', 'Minister of Culture of Destenia', 'Minister of Culture of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/42269124-fdea-4cff-96be-f7c56209c15c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(213, 2, '7aa149c3-a9eb-43a5-b10d-debc66c05af7', 'image', 'Minister of Defence of Destenia', 'Minister of Defence of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7aa149c3-a9eb-43a5-b10d-debc66c05af7.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(214, 2, '56e4de96-6034-4852-9db4-23928ffe0c65', 'image', 'Minister of Economy of Destenia', 'Minister of Economy of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/56e4de96-6034-4852-9db4-23928ffe0c65.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(215, 2, '73ebabe7-a3ba-4f79-bd5c-a35ac909c22e', 'image', 'Minister of Education of Destenia', 'Minister of Education of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/73ebabe7-a3ba-4f79-bd5c-a35ac909c22e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(216, 2, 'd70e5cbf-6533-4b5b-9e79-e92b74997684', 'image', 'Minister of Enviroment of Destenia', 'Minister of Enviroment of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d70e5cbf-6533-4b5b-9e79-e92b74997684.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(217, 2, '70feb8c2-7530-41a0-a636-772eb361fb8b', 'image', 'Minister of Foreign Affairs of Destenia', 'Minister of Foreign Affairs of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/70feb8c2-7530-41a0-a636-772eb361fb8b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(218, 2, 'ee86ef92-553a-48fa-921a-a7ddf21db509', 'image', 'Minister of Health of Destenia', 'Minister of Health of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ee86ef92-553a-48fa-921a-a7ddf21db509.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(219, 2, 'e8d7010b-be2e-4405-bebe-2038416a0360', 'image', 'Minister of Infrastructure of Destenia', 'Minister of Infrastructure of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e8d7010b-be2e-4405-bebe-2038416a0360.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(220, 2, '6437f68e-fd7f-46da-a789-72dff8e88d7c', 'image', 'Minister of Interior of Destenia', 'Minister of Interior of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6437f68e-fd7f-46da-a789-72dff8e88d7c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(221, 2, '770c340e-6f79-4b55-a153-a1d2e4cf03bc', 'image', 'Minister of Justice of Destenia', 'Minister of Justice of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/770c340e-6f79-4b55-a153-a1d2e4cf03bc.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(222, 2, 'ef2edd30-a2cb-460e-801d-76f37a82c28a', 'image', 'Minister of Sciences and Energy of Destenia', 'Minister of Sciences and Energy of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ef2edd30-a2cb-460e-801d-76f37a82c28a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(223, 2, '218384dc-ce35-46c5-a779-f45267489ed0', 'image', 'Minister of Social Affairs of Destenia', 'Minister of Social Affairs of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/218384dc-ce35-46c5-a779-f45267489ed0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(224, 2, 'cdc6ee17-048d-4783-b2c0-b720d85b4fd6', 'image', 'Minister of Sport of Destenia', 'Minister of Sport of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/cdc6ee17-048d-4783-b2c0-b720d85b4fd6.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(225, 2, 'a3cbd36a-e596-48df-aa4d-e24c36c5396a', 'image', 'Minister of State Security of Destenia', 'Minister of State Security of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a3cbd36a-e596-48df-aa4d-e24c36c5396a.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(226, 2, '20a146b8-65d7-41d1-9203-32ebbf89703e', 'image', 'Minister of Telecommunications of Destenia', 'Minister of Telecommunications of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/20a146b8-65d7-41d1-9203-32ebbf89703e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(227, 2, '79ba3219-0ae8-4383-8dc5-f6198a70fb42', 'image', 'MOD HQ in Destenia', 'MOD HQ in Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/79ba3219-0ae8-4383-8dc5-f6198a70fb42.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(228, 2, 'fb539167-3884-420b-810d-fd4b35fe1b4c', 'image', 'Parliament of Destenia', 'Parliament of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/fb539167-3884-420b-810d-fd4b35fe1b4c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(229, 2, 'b7f436c7-54ef-4a36-93e4-06ebf2786e39', 'image', 'Political system of the countries', 'Political system of the countries', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b7f436c7-54ef-4a36-93e4-06ebf2786e39.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(230, 2, 'a1b4cf7e-3725-4db3-818e-8d02ed2af53b', 'image', 'President of Alveria', 'President of Alveria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a1b4cf7e-3725-4db3-818e-8d02ed2af53b.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(231, 2, 'd1746470-7f9d-441c-b011-71b6d9a2b1e0', 'image', 'President of Boravia', 'President of Boravia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/d1746470-7f9d-441c-b011-71b6d9a2b1e0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(232, 2, '55e1a6c3-8510-499a-bae1-102738845439', 'image', 'President of Cavallesia', 'President of Cavallesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/55e1a6c3-8510-499a-bae1-102738845439.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(233, 2, 'cecedc27-78f9-40e1-bb64-c510ec549d52', 'image', 'President of Comussania', 'President of Comussania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/cecedc27-78f9-40e1-bb64-c510ec549d52.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(234, 2, '6d896606-c0ab-4f66-8607-e5769277f7ec', 'image', 'President of Cusea', 'President of Cusea', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/6d896606-c0ab-4f66-8607-e5769277f7ec.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(235, 2, '3edefdc0-e4b6-41b7-94ac-d3ba4b977364', 'image', 'President of Destenia', 'Destiny Omagu is the President of Destenia', 'jpg', 'https://dyscover.ielectro.com/assets/users/2/images/3edefdc0-e4b6-41b7-94ac-d3ba4b977364.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-26 11:12:47'),
(236, 2, '0abfd9f5-bab4-484c-9c2f-6aadbe4bb533', 'image', 'President of Fesia', 'President of Fesia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/0abfd9f5-bab4-484c-9c2f-6aadbe4bb533.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(237, 2, '8c6ba70c-a844-4e58-b1bb-055fda63d091', 'image', 'President of Kashiria', 'President of Kashiria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8c6ba70c-a844-4e58-b1bb-055fda63d091.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(238, 2, '4dd2c99d-7e58-4497-8889-49c20ac9dcde', 'image', 'President of Ricene', 'President of Ricene', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4dd2c99d-7e58-4497-8889-49c20ac9dcde.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(239, 2, 'c4ccedab-c87d-46dc-94db-dd64ca492bb0', 'image', 'President of Stasia', 'President of Stasia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/c4ccedab-c87d-46dc-94db-dd64ca492bb0.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(240, 2, '68abe143-ced0-462d-8dfd-5fc716f19189', 'image', 'President of Suklan', 'President of Suklan', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/68abe143-ced0-462d-8dfd-5fc716f19189.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(241, 2, '8abf4a15-ac75-4c9b-830b-f5cab4d50bee', 'image', 'President of Valmirica', 'President of Valmirica', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8abf4a15-ac75-4c9b-830b-f5cab4d50bee.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(242, 2, 'e84b725f-f742-48da-9725-ded8107e8d5f', 'image', 'Prime Minister of Agaritia', 'Prime Minister of Agaritia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e84b725f-f742-48da-9725-ded8107e8d5f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(243, 2, '59166d23-0015-4840-80ff-d392924b2788', 'image', 'Prime Minister of Azaria', 'Prime Minister of Azaria', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/59166d23-0015-4840-80ff-d392924b2788.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(244, 2, 'e61894fb-741a-4d2c-82b0-20db4ee85d02', 'image', 'Prime Minister of Destenia', 'Prime Minister of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e61894fb-741a-4d2c-82b0-20db4ee85d02.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(245, 2, '7ea5e3ad-4586-42b4-b4c2-08e905cd9088', 'image', 'Prime Minister of Jarnovia', 'Prime Minister of Jarnovia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7ea5e3ad-4586-42b4-b4c2-08e905cd9088.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(246, 2, '4dee7782-7f36-4c08-b515-005bcafc9626', 'image', 'Prime Minister of Lamberia', 'Prime Minister of Lamberia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4dee7782-7f36-4c08-b515-005bcafc9626.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(247, 2, '4ac8f92c-f894-44c6-af4c-1783c2c2c108', 'image', 'Prime Minister of Laocitia', 'Prime Minister of Laocitia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/4ac8f92c-f894-44c6-af4c-1783c2c2c108.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(248, 2, '64d6fab5-95f3-4836-b726-8c6d1b3cb1ae', 'image', 'Prime Minister of Metosia', 'Prime Minister of Metosia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/64d6fab5-95f3-4836-b726-8c6d1b3cb1ae.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(249, 2, '612eb3f2-8742-4ae7-9ea5-86a3ad39531f', 'image', 'Prime Minister of Verdania', 'Prime Minister of Verdania', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/612eb3f2-8742-4ae7-9ea5-86a3ad39531f.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(250, 2, '38f6cfa0-7228-4679-a170-93a680e58ea5', 'image', 'Prosecutor General of Destenia', 'Prosecutor General of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/38f6cfa0-7228-4679-a170-93a680e58ea5.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(251, 2, '880050f4-9014-462b-87c3-e6fb0ef91f1c', 'image', 'Regions of Destenia', 'Regions of Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/880050f4-9014-462b-87c3-e6fb0ef91f1c.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(252, 2, 'e64b46d9-7127-4fde-bd3e-ca8a4359fe58', 'image', 'Religious map of the world', 'Religious map of the world', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/e64b46d9-7127-4fde-bd3e-ca8a4359fe58.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(254, 2, '9f9937ea-246c-4216-b2c7-9e270a27f9f5', 'image', 'Head of the Inspectorate', 'Head of the Inspectorate of the Revolutionaries', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/9f9937ea-246c-4216-b2c7-9e270a27f9f5.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-09-03 23:25:16'),
(255, 2, '3b8bc947-3c8b-4430-8ec2-ec7382ef950e', 'image', 'Skyline of Distinia', 'Skyline of Distinia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3b8bc947-3c8b-4430-8ec2-ec7382ef950e.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(256, 2, 'b3d6ea96-fb44-4f29-baca-9953034463fd', 'image', 'Steel industry in Destenia', 'Steel industry in Destenia', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b3d6ea96-fb44-4f29-baca-9953034463fd.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(257, 2, '2ddcf7ef-0ae5-434b-9c1f-404ae1696daa', 'image', 'Sultan of Sifalam', 'Sultan of Sifalam', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/2ddcf7ef-0ae5-434b-9c1f-404ae1696daa.png', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(258, 2, '50713198-8232-4f7f-9eff-79cd38289917', 'video', 'Destenian army officer', 'Destenian army officer', 'mp4', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:38', '2026-08-10 12:20:39'),
(259, 2, '7a0fd38a-4fad-4c44-88ef-863b2a00529a', 'video', 'Destenian police officer', 'Destenian police officer', 'mp4', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(261, 2, '113177a8-3252-40f2-a943-fa63ff89712f', 'audio', 'Anthem of Agaritia', 'Anthem of Agaritia', 'mp3', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(262, 2, '72abd13a-5b2d-4494-ba5c-9bd0fe48ba18', 'audio', 'Anthem of Boravia', 'Anthem of Boravia', 'mp3', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(263, 2, '1ebdea75-360e-4052-a5a5-e9bc7c8b306c', 'audio', 'Anthem of Comussania', 'Anthem of Comussania', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:55:49'),
(264, 2, '673c5e46-c955-455e-87ec-d5ba094c75a7', 'audio', 'Anthem of Cusea', 'Anthem of Cusea', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:55:37'),
(265, 2, '4c27716e-873e-4003-b06d-522b53a232e6', 'audio', 'Anthem of Destenia', 'Anthem of Destenia', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:55:27'),
(266, 2, 'ea89262f-d2da-40d2-b116-7244645a332b', 'audio', 'Anthem of Fesia', 'Anthem of Fesia', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:55:16'),
(267, 2, '2f8d5b23-dad7-4c51-b2ec-d7d97664222e', 'audio', 'Anthem of Jarnovia', 'Anthem of Jarnovia', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:55:06'),
(268, 2, '60e232e3-1d10-4ad1-af08-946e70424831', 'audio', 'Anthem of Kashiria', 'Anthem of Kashiria', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:54:57'),
(269, 2, '95a847b8-49cd-47ca-be99-ada7cd6eef97', 'audio', 'Edrobean Anthem', 'Edrobean Anthem', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:54:45'),
(270, 2, 'd1ea7347-f956-4d54-bb44-29dc0fe04327', 'audio', 'Hymn of the United Nations', 'Hymn of the United Nations', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:54:34'),
(271, 2, 'f71067cc-d0d8-4598-8c85-6e3786b1d87b', 'audio', 'Revolutionary War', 'Revolutionary War', 'mp3', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:52:09'),
(274, 2, 'f58f6f4d-61f7-4350-94ba-28a29cca664d', 'document', 'Constitution of Destenia', 'Constitution of Destenia', 'pdf', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-15 11:59:53'),
(275, 2, '123dd9ec-0e80-4058-a7b7-cf00a2543dbb', 'document', 'Desteno Agaritian Treaty', 'Desteno Agaritian Treaty', 'pdf', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:57:14'),
(276, 2, '8d0cbaf3-fc4a-4db4-ac81-1af4d707209f', 'document', 'Treaty of the Edrobean Community', 'Treaty of the Edrobean Community', 'pdf', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-15 13:28:33'),
(277, 2, '1df23ddb-bb15-47d1-9b52-dcb1b2b27795', 'document', 'United Nations Charter', 'United Nations Charter', 'pdf', '', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-23 17:56:48'),
(278, 2, '80b7f229-17b8-4707-ac51-57a5d8ef2db4', 'template', 'Agency', 'Agency', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(279, 2, '8b38f449-404e-482d-8b02-1bc2d54039c4', 'template', 'Conflict', 'Conflict', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(280, 2, 'b2619648-3355-4464-a29c-765552fc3df5', 'template', 'Country', 'Country', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(281, 2, '8ee180bc-8f4f-4157-b631-152e2727e239', 'template', 'Statesman', 'Government official', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-14 16:29:58'),
(282, 2, '123eb29d-bcfd-4601-bab0-44fa57c88bd5', 'template', 'International organization', 'International organization', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(283, 2, 'ef5611e1-b46b-41f8-a014-a900a3bf9127', 'template', 'Military', 'Military', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(284, 2, '3bff0ac9-4b95-4e1d-8ba1-4f03059fc0d9', 'template', 'Person', 'Person', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(285, 2, '5812b691-f72b-43f8-b75f-a31a5e8394f7', 'template', 'Political party', 'Political party', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(286, 2, 'dceba50a-e704-4cf6-9104-25689acf3fca', 'template', 'Football tournament', 'Football tournament for regional, global and local matches', '', 'https://dyscover.ielectro.com/assets/brand/default-post.jpg', 'public', 1, 1, 'active', '2026-08-15 13:43:09', '2026-08-15 13:43:09'),
(287, 2, '73b46200-0224-45f8-a167-a9d5a1b53d11', 'article', '2026 WFF World Cup', '2026 WFF World Cup Valmirica', '', 'https://dyscover.ielectro.com/assets/users/2/images/a1c4db3e-f7cb-492b-8428-020e01075730.png', 'public', 1, 1, 'active', '2026-08-15 14:01:37', '2026-08-15 15:01:57'),
(288, 2, 'a1c4db3e-f7cb-492b-8428-020e01075730', 'image', '2026 WFF World Cup Logo', '2026 WFF World Cup Logo', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a1c4db3e-f7cb-492b-8428-020e01075730.png', 'public', 1, 1, 'active', '2026-08-15 14:34:24', '2026-08-23 18:52:17'),
(290, 2, 'b829bec5-3a37-48b2-90ca-7fc67f2b7bcb', 'image', 'Logo of the Edrobean Military Commission', 'Logo of the Edrobean Military Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b829bec5-3a37-48b2-90ca-7fc67f2b7bcb.png', 'public', 1, 1, 'active', '2026-08-29 20:53:02', '2026-09-01 13:45:19'),
(291, 2, 'b37f9283-4008-48b3-a260-0eb04e5cd356', 'image', 'Chairman of the Edrobean Military Commission', 'Chairman of the Edrobean Military Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/b37f9283-4008-48b3-a260-0eb04e5cd356.png', 'public', 1, 1, 'active', '2026-08-31 20:51:35', '2026-08-31 20:51:35'),
(292, 2, 'afa6460e-c2d3-48f5-a890-e7e025388cf2', 'image', 'Chief Executive of the Edrobean Statistical Agency', 'Chief Executive of the Edrobean Statistical Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/afa6460e-c2d3-48f5-a890-e7e025388cf2.png', 'public', 1, 1, 'active', '2026-08-31 22:17:35', '2026-08-31 22:17:35'),
(293, 2, 'eb6a47b8-b74d-4429-84e6-4fbc05ba10bd', 'image', 'Chairman of the Edrobean Cybersecurity Commission', 'Chairman of the Edrobean Cybersecurity Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/eb6a47b8-b74d-4429-84e6-4fbc05ba10bd.png', 'public', 1, 1, 'active', '2026-08-31 22:19:36', '2026-08-31 22:24:05'),
(294, 2, '8326b69d-de59-4bbd-b0e3-e480735e9032', 'image', 'Chief Executive of the Edrobean Maritime Agency', 'Chief Executive of the Edrobean Maritime Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/8326b69d-de59-4bbd-b0e3-e480735e9032.png', 'public', 1, 1, 'active', '2026-08-31 22:21:20', '2026-08-31 22:21:20'),
(295, 2, '98215dcf-6b7f-4bc3-a98a-6d4cfef469cf', 'image', 'Chairman of the Edrobean Environmental Commission', 'Chairman of the Edrobean Environmental Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/98215dcf-6b7f-4bc3-a98a-6d4cfef469cf.png', 'public', 1, 1, 'active', '2026-08-31 22:45:34', '2026-08-31 22:45:34'),
(296, 2, '387775b7-609b-40f2-949c-5f159e04d817', 'image', 'Chief Executive of the Edrobean Health Agency', 'Chief Executive of the Edrobean Health Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/387775b7-609b-40f2-949c-5f159e04d817.png', 'public', 1, 1, 'active', '2026-08-31 22:50:58', '2026-08-31 22:50:58'),
(297, 2, '16c8cb14-f5fe-4379-a538-a25dab9b468b', 'image', 'Chairman of the Edrobean Border Commission', 'Chairman of the Edrobean Border Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/16c8cb14-f5fe-4379-a538-a25dab9b468b.png', 'public', 1, 1, 'active', '2026-08-31 22:54:13', '2026-08-31 23:06:26'),
(298, 2, '7f7083d8-517a-4dac-89f2-a395b6a839ef', 'image', 'Chief Executive of the Edrobean Space Agency', 'Chief Executive of the Edrobean Space Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/7f7083d8-517a-4dac-89f2-a395b6a839ef.png', 'public', 1, 1, 'active', '2026-08-31 23:06:07', '2026-08-31 23:06:07'),
(299, 2, 'ff054afd-e7e7-4d72-abcc-71bfb82ba799', 'image', 'Logo of the Edrobean Statistical Agency', 'Logo of the Edrobean Statistical Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/ff054afd-e7e7-4d72-abcc-71bfb82ba799.png', 'public', 1, 1, 'active', '2026-09-01 13:47:48', '2026-09-01 13:47:48'),
(300, 2, '5d33952c-d842-40d3-aa91-b69a0314e7e2', 'image', 'Logo of the Edrobean Maritime Agency', 'Logo of the Edrobean Maritime Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/5d33952c-d842-40d3-aa91-b69a0314e7e2.png', 'public', 1, 1, 'active', '2026-09-01 13:50:00', '2026-09-01 13:50:00'),
(301, 2, '3f2c2b62-6c16-4a08-8ad6-5ec8f178af55', 'image', 'Logo of the Edrobean Environmental Commission', 'Logo of the Edrobean Environmental Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/3f2c2b62-6c16-4a08-8ad6-5ec8f178af55.png', 'public', 1, 1, 'active', '2026-09-01 13:50:38', '2026-09-01 13:50:38'),
(302, 2, 'a107a1de-7d62-4d0c-a8c3-890b14b8637e', 'image', 'Logo of the Edrobean Health Agency', 'Logo of the Edrobean Health Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/a107a1de-7d62-4d0c-a8c3-890b14b8637e.png', 'public', 1, 1, 'active', '2026-09-01 13:52:38', '2026-09-01 13:52:38'),
(303, 2, 'cf8ad272-c09d-45d8-985e-23210f69c5c5', 'image', 'Logo of the Edrobean Cybersecurity Commission', 'Logo of the Edrobean Cybersecurity Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/cf8ad272-c09d-45d8-985e-23210f69c5c5.png', 'public', 1, 1, 'active', '2026-09-01 13:57:06', '2026-09-01 13:57:06'),
(304, 2, '12eebaaa-65a5-42d1-b6b9-c29ef4a7cda4', 'image', 'Logo of the Edrobean Border Commission', 'Logo of the Edrobean Border Commission', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/12eebaaa-65a5-42d1-b6b9-c29ef4a7cda4.png', 'public', 1, 1, 'active', '2026-09-01 13:57:50', '2026-09-01 13:57:50'),
(305, 2, 'afce470f-01a5-47da-802e-bad7e32177d8', 'image', 'Logo of the Edrobean Space Agency', 'Logo of the Edrobean Space Agency', 'png', 'https://dyscover.ielectro.com/assets/users/2/images/afce470f-01a5-47da-802e-bad7e32177d8.png', 'public', 1, 1, 'active', '2026-09-01 14:02:12', '2026-09-01 14:02:12');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_bookmarks`
--

CREATE TABLE `dyscover_post_bookmarks` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_comments`
--

CREATE TABLE `dyscover_post_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `status` enum('active','hidden') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_comment_likes`
--

CREATE TABLE `dyscover_post_comment_likes` (
  `comment_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_likes`
--

CREATE TABLE `dyscover_post_likes` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_post_likes`
--

INSERT INTO `dyscover_post_likes` (`post_id`, `user_id`, `created_at`) VALUES
(235, 2, '2026-08-14 23:12:38');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_mentions`
--

CREATE TABLE `dyscover_post_mentions` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_reposts`
--

CREATE TABLE `dyscover_post_reposts` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_shares`
--

CREATE TABLE `dyscover_post_shares` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_post_shares`
--

INSERT INTO `dyscover_post_shares` (`post_id`, `user_id`, `created_at`) VALUES
(48, 2, '2026-08-12 12:15:04');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_statistics`
--

CREATE TABLE `dyscover_post_statistics` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `views` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `likes` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `comments` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `mentions` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `shares` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `bookmarks` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_post_statistics`
--

INSERT INTO `dyscover_post_statistics` (`post_id`, `views`, `likes`, `comments`, `mentions`, `shares`, `bookmarks`, `created_at`, `updated_at`) VALUES
(18, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-19 22:10:44'),
(19, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(20, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(21, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(22, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(23, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-11 17:05:44'),
(24, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-14 18:50:23'),
(25, 5, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 19:22:46'),
(26, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-28 21:49:30'),
(27, 6, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-09-06 11:20:27'),
(28, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-29 19:41:54'),
(29, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-14 18:47:22'),
(30, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-14 18:40:24'),
(31, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(32, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-18 17:20:25'),
(33, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-18 17:20:24'),
(35, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 18:53:13'),
(37, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-09-06 11:47:13'),
(38, 6, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-09-05 12:47:26'),
(39, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 18:53:09'),
(40, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 18:53:09'),
(42, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 18:53:08'),
(43, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:34', '2026-08-23 18:53:08'),
(44, 7, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-23 18:53:07'),
(46, 7, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-23 18:53:07'),
(47, 7, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-23 18:53:04'),
(48, 9, 0, 0, 0, 1, 0, '2026-08-10 12:20:35', '2026-08-23 18:53:03'),
(51, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 21:23:11'),
(52, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-30 21:42:37'),
(53, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 22:10:56'),
(55, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 22:51:23'),
(56, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 14:53:39'),
(57, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:26:21'),
(58, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(59, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-09-03 23:36:12'),
(60, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(61, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(62, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:26:39'),
(63, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:27:15'),
(64, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 20:45:28'),
(65, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:27:22'),
(66, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(67, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-24 22:44:26'),
(68, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:27:35'),
(69, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-21 14:47:25'),
(70, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(71, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(73, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 15:06:21'),
(74, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:08'),
(75, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:04'),
(76, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:59:03'),
(77, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:12'),
(78, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:17'),
(79, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:40'),
(80, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:31:43'),
(81, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:28:51'),
(82, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:29:27'),
(83, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:52:49'),
(84, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-15 13:52:17'),
(85, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-09-03 19:35:09'),
(86, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:53:14'),
(87, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-29 19:14:40'),
(88, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:13:40'),
(90, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 11:59:09'),
(91, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:13:31'),
(92, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 22:33:38'),
(93, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:13:26'),
(94, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:13:05'),
(95, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-09-03 21:24:32'),
(96, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(97, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:11:14'),
(98, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(99, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-26 13:11:04'),
(101, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 19:29:10'),
(102, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 21:33:57'),
(103, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 21:39:50'),
(104, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 21:42:45'),
(105, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 20:30:25'),
(106, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:35', '2026-08-31 21:48:06'),
(107, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-31 21:48:58'),
(108, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-31 21:29:52'),
(109, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-31 21:44:32'),
(110, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-31 21:30:27'),
(112, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-26 14:56:55'),
(113, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-30 11:21:07'),
(114, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:25:53'),
(115, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(116, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(117, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(118, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(119, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-24 22:44:59'),
(120, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(121, 5, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-09-06 10:42:06'),
(122, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(123, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(124, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-25 11:14:34'),
(125, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(126, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(127, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(128, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(129, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-26 11:23:05'),
(130, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(131, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(132, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-24 22:09:23'),
(133, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-26 12:35:04'),
(134, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-29 19:29:36'),
(135, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(136, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-25 00:26:14'),
(137, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(140, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-24 23:46:07'),
(141, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(142, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(143, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(144, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(145, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-15 13:33:38'),
(146, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-31 20:30:22'),
(147, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(148, 5, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-26 09:12:36'),
(149, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(150, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(151, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:36', '2026-08-16 21:03:21'),
(152, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-25 10:32:12'),
(153, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-25 11:14:31'),
(154, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(155, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-09-08 10:29:55'),
(156, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(157, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(158, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(159, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(160, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(161, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(162, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(163, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(164, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-23 21:58:28'),
(165, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-28 21:49:37'),
(166, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-31 20:48:08'),
(167, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 12:27:40'),
(168, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-11 16:53:06'),
(169, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(170, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(171, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(172, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-09-03 23:29:01'),
(173, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 12:26:07'),
(174, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 11:17:37'),
(175, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-29 19:43:15'),
(176, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 12:24:49'),
(177, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 12:24:45'),
(178, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(179, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(180, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(181, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(182, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(183, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(184, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(185, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(186, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 12:24:41'),
(187, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-09-05 12:47:13'),
(188, 3, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-24 23:46:11'),
(189, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(190, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(191, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(192, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-25 00:33:51'),
(193, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(194, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(195, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-26 10:19:53'),
(196, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(197, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(198, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-25 11:15:21'),
(199, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-25 11:40:30'),
(200, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(201, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(202, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(203, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(204, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(205, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-23 22:33:18'),
(206, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-15 00:21:46'),
(207, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 20:48:30'),
(208, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-18 17:22:52'),
(209, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-19 23:11:14'),
(211, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-13 09:56:59'),
(212, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 10:58:24'),
(213, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-30 21:43:15'),
(214, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(215, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 22:53:44'),
(216, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(217, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(218, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-11 16:15:28'),
(219, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(220, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(221, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 22:53:39'),
(222, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(223, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-11 16:15:39'),
(224, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(225, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 11:24:42'),
(226, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(227, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-29 19:15:06'),
(228, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 12:23:11'),
(229, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(230, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-14 19:01:00'),
(231, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(232, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(233, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(234, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-25 00:49:22'),
(235, 8, 1, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-09-03 23:29:04'),
(236, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-25 10:26:38'),
(237, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-27 11:29:50'),
(238, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(239, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 08:29:34'),
(240, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-23 21:43:09'),
(241, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 08:29:30'),
(242, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(243, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(244, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-21 14:49:20'),
(245, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(246, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(247, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(248, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-27 11:29:45'),
(249, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-27 11:29:41'),
(250, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-14 23:15:23'),
(251, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-09-08 10:24:45'),
(252, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(254, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-09-05 19:01:53'),
(255, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-26 14:57:11'),
(256, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-23 18:11:03'),
(257, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-23 18:11:09'),
(258, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:38', '2026-08-23 17:51:13'),
(259, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:50:22'),
(261, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(262, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(263, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:55:56'),
(264, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:55:52'),
(265, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:56:00'),
(266, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:23:44'),
(267, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 19:22:07'),
(268, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(269, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(270, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(271, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-15 11:42:14'),
(274, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-26 14:28:42'),
(275, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:59:24'),
(276, 4, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-23 17:56:59'),
(277, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(278, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-26 10:08:26'),
(279, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(280, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-12 07:39:14'),
(281, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-14 16:29:19'),
(282, 1, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-12 07:41:22'),
(283, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(284, 0, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(285, 2, 0, 0, 0, 0, 0, '2026-08-10 12:20:39', '2026-08-26 10:07:52'),
(286, 1, 0, 0, 0, 0, 0, '2026-08-15 13:43:09', '2026-08-15 13:43:13'),
(287, 8, 0, 0, 0, 0, 0, '2026-08-15 14:01:37', '2026-09-05 12:43:46'),
(288, 3, 0, 0, 0, 0, 0, '2026-08-15 14:34:24', '2026-08-23 18:48:38'),
(290, 2, 0, 0, 0, 0, 0, '2026-08-29 20:53:02', '2026-08-31 20:47:55'),
(291, 2, 0, 0, 0, 0, 0, '2026-08-31 20:51:35', '2026-09-02 09:56:01'),
(292, 1, 0, 0, 0, 0, 0, '2026-08-31 22:17:35', '2026-08-31 22:19:43'),
(293, 1, 0, 0, 0, 0, 0, '2026-08-31 22:19:36', '2026-08-31 22:19:47'),
(294, 0, 0, 0, 0, 0, 0, '2026-08-31 22:21:20', '2026-08-31 22:21:20'),
(295, 0, 0, 0, 0, 0, 0, '2026-08-31 22:45:34', '2026-08-31 22:45:34'),
(296, 0, 0, 0, 0, 0, 0, '2026-08-31 22:50:58', '2026-08-31 22:50:58'),
(297, 1, 0, 0, 0, 0, 0, '2026-08-31 22:54:13', '2026-08-31 23:06:10'),
(298, 1, 0, 0, 0, 0, 0, '2026-08-31 23:06:07', '2026-09-08 10:27:45'),
(299, 0, 0, 0, 0, 0, 0, '2026-09-01 13:47:48', '2026-09-01 13:47:48'),
(300, 0, 0, 0, 0, 0, 0, '2026-09-01 13:50:00', '2026-09-01 13:50:00'),
(301, 0, 0, 0, 0, 0, 0, '2026-09-01 13:50:38', '2026-09-01 13:50:38'),
(302, 0, 0, 0, 0, 0, 0, '2026-09-01 13:52:38', '2026-09-01 13:52:38'),
(303, 0, 0, 0, 0, 0, 0, '2026-09-01 13:57:06', '2026-09-01 13:57:06'),
(304, 0, 0, 0, 0, 0, 0, '2026-09-01 13:57:50', '2026-09-01 13:57:50'),
(305, 0, 0, 0, 0, 0, 0, '2026-09-01 14:02:12', '2026-09-01 14:02:12');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_tags`
--

CREATE TABLE `dyscover_post_tags` (
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `tag_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_post_tags`
--

INSERT INTO `dyscover_post_tags` (`post_id`, `tag_id`) VALUES
(18, 10),
(18, 149),
(18, 199),
(19, 14),
(19, 149),
(19, 199),
(20, 15),
(20, 199),
(20, 436),
(21, 16),
(21, 149),
(21, 199),
(22, 17),
(22, 149),
(22, 199),
(23, 18),
(23, 149),
(23, 199),
(24, 19),
(24, 44),
(24, 199),
(25, 20),
(25, 149),
(25, 199),
(26, 20),
(26, 72),
(26, 73),
(26, 102),
(26, 439),
(27, 20),
(27, 38),
(27, 109),
(27, 211),
(28, 79),
(28, 149),
(28, 213),
(28, 437),
(29, 28),
(29, 199),
(29, 438),
(30, 29),
(30, 149),
(30, 199),
(31, 30),
(31, 149),
(31, 199),
(32, 31),
(32, 199),
(32, 436),
(33, 32),
(33, 149),
(33, 199),
(35, 35),
(35, 149),
(35, 199),
(37, 20),
(37, 37),
(37, 59),
(37, 217),
(38, 20),
(38, 37),
(38, 38),
(38, 218),
(38, 219),
(39, 39),
(39, 199),
(39, 436),
(40, 40),
(40, 199),
(40, 436),
(42, 42),
(42, 199),
(42, 436),
(43, 43),
(43, 199),
(43, 436),
(44, 79),
(44, 220),
(44, 436),
(44, 437),
(46, 45),
(46, 149),
(46, 199),
(46, 440),
(46, 441),
(47, 46),
(47, 149),
(47, 199),
(48, 47),
(48, 79),
(48, 435),
(48, 443),
(51, 51),
(51, 54),
(51, 149),
(51, 213),
(52, 26),
(52, 51),
(52, 55),
(52, 56),
(52, 212),
(53, 51),
(53, 149),
(53, 213),
(53, 451),
(55, 2),
(55, 20),
(55, 53),
(55, 60),
(55, 227),
(56, 20),
(56, 21),
(56, 22),
(56, 60),
(56, 209),
(57, 20),
(57, 21),
(57, 60),
(57, 61),
(57, 62),
(58, 20),
(58, 21),
(58, 60),
(58, 62),
(58, 63),
(59, 20),
(59, 38),
(59, 102),
(59, 214),
(60, 20),
(60, 21),
(60, 60),
(60, 62),
(60, 66),
(61, 20),
(61, 21),
(61, 60),
(61, 62),
(61, 67),
(62, 2),
(62, 68),
(62, 69),
(62, 232),
(63, 20),
(63, 21),
(63, 60),
(63, 70),
(63, 89),
(64, 20),
(64, 21),
(64, 60),
(64, 70),
(64, 72),
(65, 20),
(65, 21),
(65, 60),
(65, 70),
(65, 73),
(66, 20),
(66, 21),
(66, 65),
(66, 70),
(66, 74),
(67, 2),
(67, 29),
(67, 75),
(67, 76),
(67, 77),
(68, 20),
(68, 38),
(68, 78),
(68, 218),
(68, 219),
(69, 2),
(69, 79),
(69, 80),
(69, 236),
(70, 2),
(70, 81),
(70, 82),
(70, 237),
(71, 26),
(71, 27),
(71, 83),
(71, 85),
(71, 212),
(73, 2),
(73, 20),
(73, 87),
(74, 2),
(74, 20),
(74, 21),
(74, 88),
(74, 239),
(75, 20),
(75, 21),
(75, 71),
(75, 89),
(75, 90),
(76, 20),
(76, 21),
(76, 72),
(76, 90),
(76, 209),
(77, 20),
(77, 21),
(77, 72),
(77, 91),
(77, 209),
(78, 2),
(78, 20),
(78, 21),
(78, 92),
(78, 93),
(79, 2),
(79, 20),
(79, 21),
(79, 94),
(79, 95),
(80, 2),
(80, 20),
(80, 21),
(80, 52),
(80, 245),
(81, 2),
(81, 19),
(81, 20),
(81, 21),
(81, 96),
(82, 2),
(82, 20),
(82, 21),
(82, 97),
(82, 247),
(83, 2),
(83, 20),
(83, 21),
(83, 98),
(83, 248),
(84, 2),
(84, 20),
(84, 21),
(84, 99),
(84, 100),
(85, 2),
(85, 20),
(85, 21),
(85, 59),
(86, 2),
(86, 20),
(86, 21),
(86, 101),
(86, 251),
(87, 2),
(87, 20),
(87, 21),
(87, 102),
(87, 209),
(88, 20),
(88, 21),
(88, 102),
(88, 103),
(88, 209),
(90, 20),
(90, 21),
(90, 73),
(90, 90),
(90, 255),
(91, 20),
(91, 21),
(91, 62),
(91, 106),
(91, 214),
(92, 20),
(92, 21),
(92, 92),
(92, 105),
(92, 107),
(93, 20),
(93, 21),
(93, 105),
(93, 108),
(93, 109),
(94, 2),
(94, 20),
(94, 21),
(94, 86),
(94, 262),
(95, 2),
(95, 20),
(95, 21),
(95, 95),
(95, 110),
(96, 24),
(96, 25),
(96, 93),
(96, 111),
(96, 264),
(97, 20),
(97, 38),
(97, 114),
(98, 20),
(98, 21),
(98, 112),
(98, 115),
(98, 116),
(99, 2),
(99, 20),
(99, 21),
(99, 112),
(99, 117),
(101, 2),
(101, 26),
(101, 118),
(101, 120),
(101, 212),
(102, 118),
(102, 121),
(102, 149),
(102, 213),
(103, 2),
(103, 26),
(103, 118),
(103, 122),
(103, 212),
(104, 2),
(104, 26),
(104, 118),
(104, 123),
(104, 212),
(105, 2),
(105, 26),
(105, 118),
(105, 124),
(105, 212),
(106, 2),
(106, 26),
(106, 53),
(106, 118),
(106, 212),
(107, 26),
(107, 118),
(107, 125),
(107, 126),
(107, 212),
(108, 118),
(108, 149),
(108, 213),
(108, 452),
(109, 2),
(109, 26),
(109, 118),
(109, 129),
(109, 212),
(110, 2),
(110, 26),
(110, 118),
(110, 130),
(110, 212),
(112, 2),
(112, 26),
(112, 131),
(112, 212),
(112, 274),
(113, 26),
(113, 91),
(113, 102),
(113, 209),
(113, 212),
(114, 2),
(114, 10),
(114, 132),
(114, 276),
(114, 277),
(115, 2),
(115, 14),
(115, 132),
(115, 276),
(115, 278),
(116, 2),
(116, 15),
(116, 132),
(116, 276),
(116, 279),
(117, 2),
(117, 16),
(117, 132),
(117, 276),
(117, 280),
(118, 2),
(118, 17),
(118, 132),
(118, 276),
(118, 281),
(119, 2),
(119, 18),
(119, 132),
(119, 276),
(119, 282),
(120, 2),
(120, 19),
(120, 132),
(120, 276),
(120, 283),
(121, 2),
(121, 20),
(121, 132),
(121, 276),
(121, 284),
(122, 2),
(122, 28),
(122, 132),
(122, 276),
(122, 285),
(123, 2),
(123, 29),
(123, 132),
(123, 276),
(123, 286),
(124, 2),
(124, 30),
(124, 132),
(124, 276),
(124, 287),
(125, 2),
(125, 31),
(125, 132),
(125, 276),
(125, 288),
(126, 2),
(126, 32),
(126, 132),
(126, 276),
(126, 289),
(127, 2),
(127, 35),
(127, 132),
(127, 276),
(127, 290),
(128, 2),
(128, 39),
(128, 132),
(128, 276),
(128, 291),
(129, 2),
(129, 39),
(129, 132),
(129, 276),
(129, 292),
(130, 2),
(130, 40),
(130, 132),
(130, 276),
(130, 293),
(131, 2),
(131, 42),
(131, 132),
(131, 276),
(131, 294),
(132, 2),
(132, 43),
(132, 132),
(132, 276),
(132, 295),
(133, 20),
(133, 21),
(133, 22),
(133, 132),
(133, 209),
(134, 26),
(134, 27),
(134, 132),
(134, 212),
(134, 276),
(135, 2),
(135, 20),
(135, 132),
(135, 133),
(135, 276),
(136, 2),
(136, 45),
(136, 132),
(136, 276),
(136, 299),
(137, 2),
(137, 46),
(137, 132),
(137, 276),
(137, 300),
(140, 2),
(140, 10),
(140, 90),
(140, 276),
(140, 303),
(141, 2),
(141, 14),
(141, 90),
(141, 276),
(141, 304),
(142, 2),
(142, 15),
(142, 90),
(142, 276),
(142, 305),
(143, 2),
(143, 16),
(143, 90),
(143, 276),
(143, 306),
(144, 2),
(144, 90),
(144, 138),
(144, 276),
(144, 307),
(145, 2),
(145, 17),
(145, 90),
(145, 276),
(145, 308),
(146, 2),
(146, 18),
(146, 90),
(146, 276),
(146, 309),
(147, 2),
(147, 19),
(147, 90),
(147, 276),
(147, 310),
(148, 2),
(148, 20),
(148, 90),
(148, 276),
(148, 311),
(149, 2),
(149, 90),
(149, 139),
(149, 276),
(149, 312),
(150, 2),
(150, 90),
(150, 140),
(150, 276),
(150, 313),
(151, 2),
(151, 28),
(151, 90),
(151, 276),
(151, 314),
(152, 2),
(152, 29),
(152, 90),
(152, 276),
(152, 315),
(153, 2),
(153, 30),
(153, 90),
(153, 276),
(153, 316),
(154, 2),
(154, 31),
(154, 90),
(154, 276),
(154, 317),
(155, 2),
(155, 32),
(155, 90),
(155, 276),
(155, 318),
(156, 2),
(156, 90),
(156, 141),
(156, 276),
(156, 319),
(157, 2),
(157, 90),
(157, 142),
(157, 276),
(157, 320),
(158, 2),
(158, 35),
(158, 90),
(158, 276),
(158, 321),
(159, 2),
(159, 90),
(159, 143),
(159, 276),
(159, 322),
(160, 2),
(160, 39),
(160, 90),
(160, 276),
(160, 323),
(161, 2),
(161, 90),
(161, 144),
(161, 276),
(161, 324),
(162, 2),
(162, 40),
(162, 90),
(162, 276),
(162, 325),
(163, 2),
(163, 42),
(163, 90),
(163, 276),
(163, 326),
(164, 2),
(164, 43),
(164, 90),
(164, 276),
(164, 327),
(165, 20),
(165, 90),
(165, 102),
(165, 450),
(166, 26),
(166, 27),
(166, 90),
(166, 212),
(166, 276),
(167, 2),
(167, 27),
(167, 44),
(167, 90),
(167, 276),
(168, 47),
(168, 79),
(168, 90),
(168, 443),
(169, 2),
(169, 45),
(169, 90),
(169, 276),
(169, 332),
(170, 2),
(170, 90),
(170, 146),
(170, 276),
(170, 333),
(171, 2),
(171, 46),
(171, 90),
(171, 276),
(171, 334),
(172, 20),
(172, 38),
(172, 84),
(172, 113),
(173, 38),
(173, 459),
(173, 460),
(174, 2),
(174, 20),
(174, 136),
(174, 148),
(175, 2),
(175, 136),
(175, 148),
(175, 149),
(176, 2),
(176, 47),
(176, 136),
(176, 148),
(177, 2),
(177, 136),
(177, 150),
(177, 151),
(177, 340),
(178, 2),
(178, 138),
(178, 152),
(179, 2),
(179, 139),
(179, 152),
(179, 342),
(180, 2),
(180, 141),
(180, 152),
(180, 343),
(181, 2),
(181, 142),
(181, 152),
(181, 344),
(182, 2),
(182, 143),
(182, 152),
(182, 345),
(183, 2),
(183, 144),
(183, 152),
(184, 2),
(184, 146),
(184, 152),
(184, 347),
(185, 2),
(185, 20),
(185, 85),
(185, 153),
(185, 348),
(186, 20),
(186, 38),
(186, 154),
(186, 155),
(187, 20),
(187, 38),
(187, 113),
(187, 156),
(188, 2),
(188, 10),
(188, 136),
(189, 2),
(189, 14),
(189, 136),
(189, 352),
(190, 2),
(190, 15),
(190, 136),
(190, 353),
(191, 2),
(191, 16),
(191, 136),
(191, 354),
(192, 2),
(192, 17),
(192, 136),
(193, 2),
(193, 18),
(193, 136),
(194, 2),
(194, 19),
(194, 136),
(194, 357),
(195, 2),
(195, 20),
(195, 136),
(196, 2),
(196, 28),
(196, 136),
(196, 359),
(197, 2),
(197, 29),
(197, 136),
(198, 2),
(198, 30),
(198, 136),
(199, 2),
(199, 31),
(199, 136),
(200, 2),
(200, 32),
(200, 136),
(201, 2),
(201, 35),
(201, 136),
(201, 364),
(202, 2),
(202, 39),
(202, 136),
(202, 365),
(203, 2),
(203, 40),
(203, 136),
(203, 366),
(204, 2),
(204, 42),
(204, 136),
(204, 367),
(205, 2),
(205, 43),
(205, 136),
(205, 368),
(206, 2),
(206, 27),
(206, 44),
(206, 136),
(207, 2),
(207, 26),
(207, 27),
(207, 136),
(207, 212),
(208, 2),
(208, 45),
(208, 136),
(209, 2),
(209, 46),
(209, 136),
(211, 2),
(211, 20),
(211, 102),
(211, 158),
(211, 209),
(212, 20),
(212, 59),
(212, 92),
(212, 119),
(212, 159),
(213, 20),
(213, 59),
(213, 92),
(213, 120),
(213, 159),
(214, 20),
(214, 59),
(214, 92),
(214, 159),
(214, 160),
(215, 20),
(215, 59),
(215, 92),
(215, 159),
(215, 161),
(216, 20),
(216, 59),
(216, 92),
(216, 159),
(216, 162),
(217, 20),
(217, 92),
(217, 128),
(217, 159),
(217, 163),
(218, 20),
(218, 59),
(218, 92),
(218, 123),
(218, 159),
(219, 20),
(219, 59),
(219, 92),
(219, 124),
(219, 159),
(220, 20),
(220, 59),
(220, 92),
(220, 159),
(220, 164),
(221, 20),
(221, 53),
(221, 59),
(221, 92),
(221, 159),
(222, 20),
(222, 92),
(222, 121),
(222, 159),
(222, 165),
(223, 20),
(223, 92),
(223, 127),
(223, 128),
(223, 159),
(224, 20),
(224, 59),
(224, 92),
(224, 159),
(224, 166),
(225, 20),
(225, 67),
(225, 92),
(225, 159),
(225, 167),
(226, 20),
(226, 59),
(226, 92),
(226, 129),
(226, 159),
(227, 2),
(227, 20),
(227, 168),
(228, 2),
(228, 20),
(228, 169),
(229, 2),
(229, 79),
(229, 151),
(229, 170),
(229, 386),
(230, 14),
(230, 37),
(230, 109),
(230, 259),
(230, 387),
(231, 16),
(231, 37),
(231, 109),
(231, 259),
(231, 387),
(232, 17),
(232, 37),
(232, 109),
(232, 259),
(232, 387),
(233, 18),
(233, 37),
(233, 109),
(233, 259),
(233, 387),
(234, 19),
(234, 37),
(234, 109),
(234, 259),
(234, 387),
(235, 20),
(235, 38),
(235, 109),
(235, 140),
(235, 211),
(236, 28),
(236, 37),
(236, 109),
(236, 259),
(236, 387),
(237, 30),
(237, 37),
(237, 109),
(237, 259),
(237, 387),
(238, 37),
(238, 39),
(238, 109),
(238, 259),
(238, 387),
(239, 37),
(239, 42),
(239, 109),
(239, 259),
(239, 387),
(240, 37),
(240, 43),
(240, 109),
(240, 259),
(240, 387),
(241, 37),
(241, 45),
(241, 109),
(241, 259),
(241, 387),
(242, 10),
(242, 92),
(242, 159),
(242, 171),
(242, 257),
(243, 15),
(243, 92),
(243, 159),
(243, 171),
(243, 257),
(244, 20),
(244, 92),
(244, 159),
(244, 171),
(244, 257),
(245, 29),
(245, 92),
(245, 159),
(245, 171),
(245, 257),
(246, 31),
(246, 92),
(246, 159),
(246, 171),
(246, 257),
(247, 32),
(247, 92),
(247, 159),
(247, 171),
(247, 257),
(248, 35),
(248, 92),
(248, 159),
(248, 171),
(248, 257),
(249, 46),
(249, 92),
(249, 159),
(249, 171),
(249, 257),
(250, 2),
(250, 20),
(250, 85),
(250, 172),
(250, 408),
(251, 2),
(251, 20),
(251, 173),
(251, 409),
(252, 2),
(252, 47),
(252, 136),
(252, 174),
(254, 20),
(254, 38),
(254, 458),
(255, 2),
(255, 140),
(255, 175),
(255, 413),
(256, 2),
(256, 20),
(256, 176),
(256, 177),
(256, 414),
(257, 2),
(257, 40),
(257, 178),
(257, 415),
(258, 20),
(258, 21),
(258, 72),
(258, 180),
(258, 209),
(259, 20),
(259, 21),
(259, 62),
(259, 180),
(259, 214),
(261, 10),
(261, 181),
(261, 182),
(261, 276),
(261, 418),
(262, 16),
(262, 181),
(262, 182),
(262, 276),
(262, 419),
(263, 18),
(263, 181),
(263, 182),
(263, 276),
(263, 420),
(264, 19),
(264, 181),
(264, 182),
(264, 276),
(264, 421),
(265, 20),
(265, 181),
(265, 182),
(265, 276),
(265, 422),
(266, 28),
(266, 181),
(266, 182),
(266, 276),
(266, 423),
(267, 29),
(267, 181),
(267, 182),
(267, 276),
(267, 424),
(268, 30),
(268, 181),
(268, 182),
(268, 276),
(268, 425),
(269, 26),
(269, 181),
(269, 182),
(269, 212),
(269, 276),
(270, 47),
(270, 181),
(270, 183),
(270, 443),
(271, 181),
(271, 184),
(271, 185),
(274, 20),
(274, 187),
(274, 188),
(275, 10),
(275, 187),
(275, 189),
(275, 190),
(275, 191),
(276, 26),
(276, 27),
(276, 187),
(276, 191),
(276, 212),
(277, 47),
(277, 79),
(277, 192),
(277, 443),
(278, 116),
(278, 193),
(279, 193),
(279, 196),
(280, 90),
(280, 132),
(280, 193),
(280, 199),
(281, 37),
(281, 59),
(281, 193),
(281, 201),
(281, 260),
(282, 182),
(282, 193),
(282, 203),
(282, 204),
(283, 90),
(283, 102),
(283, 132),
(283, 193),
(283, 209),
(284, 193),
(284, 205),
(285, 37),
(285, 151),
(285, 193),
(285, 207),
(285, 218),
(286, 99),
(286, 444),
(286, 445),
(287, 99),
(287, 446),
(287, 447),
(288, 45),
(288, 99),
(288, 446),
(288, 447),
(290, 102),
(290, 132),
(290, 149),
(290, 213),
(291, 51),
(291, 72),
(291, 102),
(291, 149),
(291, 213),
(292, 54),
(292, 116),
(292, 149),
(292, 213),
(293, 54),
(293, 149),
(293, 213),
(293, 454),
(294, 116),
(294, 149),
(294, 213),
(294, 453),
(295, 54),
(295, 116),
(295, 149),
(295, 213),
(296, 54),
(296, 116),
(296, 149),
(296, 213),
(297, 54),
(297, 149),
(297, 213),
(297, 455),
(298, 54),
(298, 116),
(298, 126),
(298, 149),
(298, 213),
(299, 116),
(299, 149),
(299, 156),
(299, 213),
(299, 456),
(300, 116),
(300, 149),
(300, 156),
(300, 213),
(300, 457),
(301, 54),
(301, 149),
(301, 156),
(301, 162),
(301, 213),
(302, 116),
(302, 123),
(302, 149),
(302, 156),
(302, 213),
(303, 116),
(303, 149),
(303, 156),
(303, 213),
(303, 454),
(304, 116),
(304, 149),
(304, 156),
(304, 213),
(304, 455),
(305, 116),
(305, 126),
(305, 149),
(305, 156),
(305, 213);

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_post_views`
--

CREATE TABLE `dyscover_post_views` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_post_views`
--

INSERT INTO `dyscover_post_views` (`id`, `post_id`, `user_id`, `created_at`) VALUES
(26, 48, 2, '2026-08-10 12:22:14'),
(27, 44, 2, '2026-08-10 12:22:17'),
(28, 254, 2, '2026-08-10 12:22:24'),
(29, 250, 2, '2026-08-10 12:22:33'),
(31, 259, 2, '2026-08-10 12:23:11'),
(32, 258, 2, '2026-08-10 12:23:20'),
(34, 266, 2, '2026-08-10 12:23:44'),
(35, 276, 2, '2026-08-10 12:24:05'),
(36, 275, 2, '2026-08-10 12:24:11'),
(37, 274, 2, '2026-08-10 12:24:17'),
(39, 114, 2, '2026-08-10 12:25:53'),
(40, 188, 2, '2026-08-10 12:25:56'),
(41, 140, 2, '2026-08-10 12:25:59'),
(42, 25, 2, '2026-08-10 12:26:15'),
(43, 26, 2, '2026-08-10 12:34:26'),
(44, 28, 2, '2026-08-10 12:34:32'),
(45, 44, 1, '2026-08-10 13:05:46'),
(46, 46, 2, '2026-08-10 19:24:05'),
(47, 47, 2, '2026-08-10 20:40:20'),
(49, 43, 2, '2026-08-10 20:40:23'),
(50, 42, 2, '2026-08-10 20:40:24'),
(52, 40, 2, '2026-08-10 20:40:25'),
(53, 39, 2, '2026-08-10 20:40:26'),
(54, 38, 2, '2026-08-10 20:40:26'),
(55, 148, 2, '2026-08-10 21:10:47'),
(56, 121, 2, '2026-08-10 21:10:52'),
(57, 174, 2, '2026-08-10 21:28:07'),
(58, 165, 2, '2026-08-10 22:00:07'),
(59, 235, 2, '2026-08-10 22:28:57'),
(60, 92, 2, '2026-08-10 22:33:38'),
(61, 244, 2, '2026-08-10 22:35:30'),
(62, 78, 2, '2026-08-10 22:50:59'),
(63, 95, 2, '2026-08-10 22:51:19'),
(64, 55, 2, '2026-08-10 22:51:23'),
(65, 212, 2, '2026-08-10 22:53:34'),
(66, 221, 2, '2026-08-10 22:53:39'),
(67, 215, 2, '2026-08-10 22:53:44'),
(68, 228, 2, '2026-08-10 22:56:17'),
(69, 218, 2, '2026-08-11 16:15:28'),
(70, 223, 2, '2026-08-11 16:15:39'),
(71, 44, 2, '2026-08-11 16:24:38'),
(72, 167, 2, '2026-08-11 16:51:42'),
(73, 168, 2, '2026-08-11 16:53:06'),
(74, 23, 2, '2026-08-11 17:05:44'),
(75, 276, 2, '2026-08-11 22:35:47'),
(76, 28, 2, '2026-08-11 22:44:28'),
(77, 148, 2, '2026-08-11 23:07:15'),
(78, 166, 2, '2026-08-11 23:16:30'),
(79, 38, 2, '2026-08-11 23:21:16'),
(80, 187, 2, '2026-08-11 23:56:13'),
(81, 48, 2, '2026-08-12 07:10:15'),
(82, 280, 2, '2026-08-12 07:39:14'),
(83, 282, 2, '2026-08-12 07:41:22'),
(84, 281, 2, '2026-08-12 07:48:53'),
(85, 235, 2, '2026-08-12 09:54:25'),
(86, 48, 1, '2026-08-12 10:49:21'),
(87, 46, 2, '2026-08-12 11:01:39'),
(88, 241, 2, '2026-08-12 11:02:45'),
(89, 46, 3, '2026-08-12 12:32:00'),
(90, 177, 2, '2026-08-12 12:37:57'),
(91, 47, 2, '2026-08-12 16:09:16'),
(92, 26, 2, '2026-08-13 09:31:46'),
(93, 27, 2, '2026-08-13 09:32:25'),
(94, 211, 2, '2026-08-13 09:56:59'),
(95, 148, 2, '2026-08-13 10:02:25'),
(96, 121, 2, '2026-08-13 10:02:28'),
(97, 174, 2, '2026-08-13 13:32:00'),
(98, 187, 2, '2026-08-13 21:40:36'),
(100, 281, 2, '2026-08-14 16:29:19'),
(101, 235, 2, '2026-08-14 17:30:23'),
(102, 285, 2, '2026-08-14 18:16:22'),
(103, 27, 2, '2026-08-14 18:17:11'),
(104, 26, 2, '2026-08-14 18:17:17'),
(105, 38, 2, '2026-08-14 18:20:57'),
(106, 44, 2, '2026-08-14 18:21:04'),
(107, 48, 2, '2026-08-14 18:31:10'),
(108, 47, 2, '2026-08-14 18:31:16'),
(109, 46, 2, '2026-08-14 18:31:20'),
(110, 37, 2, '2026-08-14 18:40:06'),
(113, 30, 2, '2026-08-14 18:40:24'),
(114, 28, 2, '2026-08-14 18:40:30'),
(115, 35, 2, '2026-08-14 18:44:50'),
(116, 29, 2, '2026-08-14 18:47:22'),
(117, 24, 2, '2026-08-14 18:50:23'),
(118, 25, 2, '2026-08-14 18:50:29'),
(119, 230, 2, '2026-08-14 19:01:00'),
(120, 18, 2, '2026-08-14 19:02:20'),
(122, 121, 2, '2026-08-14 23:05:59'),
(123, 250, 2, '2026-08-14 23:15:23'),
(124, 76, 2, '2026-08-14 23:16:02'),
(125, 133, 2, '2026-08-14 23:16:08'),
(126, 77, 2, '2026-08-14 23:16:13'),
(127, 165, 2, '2026-08-14 23:16:24'),
(128, 90, 2, '2026-08-14 23:23:01'),
(129, 75, 2, '2026-08-14 23:23:06'),
(130, 48, 1, '2026-08-15 00:01:36'),
(131, 206, 2, '2026-08-15 00:21:46'),
(132, 134, 2, '2026-08-15 00:30:12'),
(133, 166, 2, '2026-08-15 00:30:16'),
(135, 53, 2, '2026-08-15 00:36:55'),
(136, 52, 2, '2026-08-15 00:37:00'),
(138, 276, 2, '2026-08-15 00:42:00'),
(139, 175, 2, '2026-08-15 10:42:22'),
(140, 271, 2, '2026-08-15 11:42:14'),
(141, 275, 2, '2026-08-15 11:53:07'),
(142, 274, 2, '2026-08-15 11:53:16'),
(143, 145, 2, '2026-08-15 13:33:38'),
(144, 106, 2, '2026-08-15 13:33:41'),
(145, 101, 2, '2026-08-15 13:33:47'),
(147, 286, 2, '2026-08-15 13:43:13'),
(148, 84, 2, '2026-08-15 13:52:17'),
(149, 287, 2, '2026-08-15 14:01:41'),
(150, 288, 2, '2026-08-15 14:34:55'),
(151, 257, 2, '2026-08-15 14:34:57'),
(152, 18, 2, '2026-08-15 21:17:47'),
(153, 48, 2, '2026-08-15 21:18:04'),
(154, 288, 2, '2026-08-16 15:53:58'),
(155, 47, 2, '2026-08-16 18:13:02'),
(156, 151, 2, '2026-08-16 21:03:21'),
(158, 244, 2, '2026-08-17 13:50:54'),
(160, 287, 2, '2026-08-18 17:19:17'),
(161, 48, 2, '2026-08-18 17:19:19'),
(162, 47, 2, '2026-08-18 17:19:20'),
(163, 46, 2, '2026-08-18 17:19:20'),
(164, 44, 2, '2026-08-18 17:19:21'),
(165, 43, 2, '2026-08-18 17:19:22'),
(166, 42, 2, '2026-08-18 17:19:22'),
(167, 40, 2, '2026-08-18 17:19:23'),
(168, 39, 2, '2026-08-18 17:19:23'),
(169, 38, 2, '2026-08-18 17:19:24'),
(170, 37, 2, '2026-08-18 17:19:24'),
(172, 35, 2, '2026-08-18 17:20:15'),
(174, 33, 2, '2026-08-18 17:20:24'),
(175, 32, 2, '2026-08-18 17:20:25'),
(176, 208, 2, '2026-08-18 17:22:52'),
(177, 25, 2, '2026-08-18 17:28:01'),
(178, 27, 2, '2026-08-18 17:28:09'),
(179, 148, 2, '2026-08-18 17:30:57'),
(180, 244, 2, '2026-08-19 11:45:53'),
(181, 85, 2, '2026-08-19 14:21:46'),
(182, 18, 2, '2026-08-19 22:10:44'),
(184, 275, 2, '2026-08-19 22:14:05'),
(185, 188, 2, '2026-08-19 22:45:37'),
(186, 47, 2, '2026-08-19 22:53:11'),
(187, 209, 2, '2026-08-19 23:11:14'),
(188, 287, 2, '2026-08-19 23:24:23'),
(189, 25, 2, '2026-08-20 14:27:05'),
(190, 175, 2, '2026-08-20 15:11:29'),
(192, 48, 2, '2026-08-20 16:09:57'),
(193, 46, 2, '2026-08-20 16:09:59'),
(194, 44, 2, '2026-08-20 16:10:00'),
(195, 27, 2, '2026-08-20 16:10:09'),
(196, 235, 2, '2026-08-20 16:13:48'),
(197, 68, 2, '2026-08-20 19:54:40'),
(198, 69, 2, '2026-08-21 14:47:25'),
(199, 78, 2, '2026-08-21 14:49:12'),
(200, 244, 2, '2026-08-21 14:49:20'),
(202, 259, 2, '2026-08-23 17:50:22'),
(203, 258, 2, '2026-08-23 17:51:13'),
(204, 264, 2, '2026-08-23 17:55:52'),
(205, 263, 2, '2026-08-23 17:55:56'),
(206, 265, 2, '2026-08-23 17:56:00'),
(207, 276, 2, '2026-08-23 17:56:59'),
(209, 274, 2, '2026-08-23 17:58:10'),
(210, 275, 2, '2026-08-23 17:59:24'),
(211, 256, 2, '2026-08-23 18:11:03'),
(212, 257, 2, '2026-08-23 18:11:09'),
(213, 288, 2, '2026-08-23 18:48:38'),
(214, 287, 2, '2026-08-23 18:52:24'),
(215, 48, 2, '2026-08-23 18:53:03'),
(216, 47, 2, '2026-08-23 18:53:04'),
(217, 46, 2, '2026-08-23 18:53:07'),
(218, 44, 2, '2026-08-23 18:53:07'),
(219, 43, 2, '2026-08-23 18:53:08'),
(220, 42, 2, '2026-08-23 18:53:08'),
(221, 40, 2, '2026-08-23 18:53:09'),
(222, 39, 2, '2026-08-23 18:53:09'),
(223, 38, 2, '2026-08-23 18:53:10'),
(224, 37, 2, '2026-08-23 18:53:10'),
(226, 35, 2, '2026-08-23 18:53:13'),
(227, 267, 2, '2026-08-23 19:22:07'),
(228, 25, 2, '2026-08-23 19:22:46'),
(229, 235, 2, '2026-08-23 19:36:43'),
(230, 174, 2, '2026-08-23 19:59:30'),
(231, 251, 2, '2026-08-23 20:04:04'),
(232, 240, 2, '2026-08-23 21:43:09'),
(233, 132, 2, '2026-08-23 21:57:30'),
(234, 164, 2, '2026-08-23 21:58:28'),
(235, 205, 2, '2026-08-23 22:33:18'),
(236, 132, 2, '2026-08-24 22:09:23'),
(237, 146, 2, '2026-08-24 22:35:40'),
(238, 67, 2, '2026-08-24 22:44:26'),
(239, 119, 2, '2026-08-24 22:44:59'),
(240, 140, 2, '2026-08-24 23:46:07'),
(241, 188, 2, '2026-08-24 23:46:11'),
(242, 136, 2, '2026-08-25 00:26:14'),
(243, 192, 2, '2026-08-25 00:33:51'),
(244, 234, 2, '2026-08-25 00:49:22'),
(245, 236, 2, '2026-08-25 10:26:38'),
(246, 152, 2, '2026-08-25 10:32:12'),
(247, 153, 2, '2026-08-25 11:14:31'),
(248, 124, 2, '2026-08-25 11:14:34'),
(249, 198, 2, '2026-08-25 11:15:21'),
(250, 199, 2, '2026-08-25 11:40:30'),
(251, 241, 2, '2026-08-26 08:29:30'),
(252, 239, 2, '2026-08-26 08:29:34'),
(253, 235, 2, '2026-08-26 09:12:15'),
(254, 121, 2, '2026-08-26 09:12:31'),
(255, 148, 2, '2026-08-26 09:12:36'),
(256, 285, 2, '2026-08-26 10:07:52'),
(257, 278, 2, '2026-08-26 10:08:26'),
(258, 195, 2, '2026-08-26 10:19:53'),
(259, 212, 2, '2026-08-26 10:58:24'),
(260, 85, 2, '2026-08-26 11:11:41'),
(261, 27, 2, '2026-08-26 11:13:05'),
(262, 174, 2, '2026-08-26 11:17:37'),
(263, 287, 2, '2026-08-26 11:18:19'),
(264, 129, 2, '2026-08-26 11:23:05'),
(265, 225, 2, '2026-08-26 11:24:42'),
(267, 52, 2, '2026-08-26 11:26:06'),
(269, 57, 2, '2026-08-26 11:26:21'),
(270, 59, 2, '2026-08-26 11:26:25'),
(271, 62, 2, '2026-08-26 11:26:39'),
(272, 63, 2, '2026-08-26 11:27:15'),
(273, 64, 2, '2026-08-26 11:27:18'),
(274, 65, 2, '2026-08-26 11:27:22'),
(275, 68, 2, '2026-08-26 11:27:35'),
(276, 75, 2, '2026-08-26 11:28:04'),
(277, 74, 2, '2026-08-26 11:28:08'),
(278, 77, 2, '2026-08-26 11:28:12'),
(279, 78, 2, '2026-08-26 11:28:17'),
(280, 79, 2, '2026-08-26 11:28:40'),
(281, 81, 2, '2026-08-26 11:28:51'),
(282, 82, 2, '2026-08-26 11:29:27'),
(283, 80, 2, '2026-08-26 11:31:43'),
(284, 83, 2, '2026-08-26 11:52:49'),
(285, 86, 2, '2026-08-26 11:53:14'),
(286, 165, 2, '2026-08-26 11:58:48'),
(287, 76, 2, '2026-08-26 11:59:03'),
(288, 90, 2, '2026-08-26 11:59:09'),
(289, 227, 2, '2026-08-26 12:23:08'),
(290, 228, 2, '2026-08-26 12:23:11'),
(292, 186, 2, '2026-08-26 12:24:41'),
(293, 177, 2, '2026-08-26 12:24:45'),
(294, 176, 2, '2026-08-26 12:24:49'),
(295, 173, 2, '2026-08-26 12:26:07'),
(296, 172, 2, '2026-08-26 12:26:40'),
(297, 167, 2, '2026-08-26 12:27:40'),
(298, 133, 2, '2026-08-26 12:35:04'),
(300, 99, 2, '2026-08-26 13:11:04'),
(301, 97, 2, '2026-08-26 13:11:14'),
(302, 94, 2, '2026-08-26 13:13:05'),
(303, 93, 2, '2026-08-26 13:13:26'),
(304, 91, 2, '2026-08-26 13:13:31'),
(305, 88, 2, '2026-08-26 13:13:40'),
(307, 254, 2, '2026-08-26 13:55:47'),
(308, 274, 2, '2026-08-26 14:28:42'),
(310, 56, 2, '2026-08-26 14:53:39'),
(311, 108, 2, '2026-08-26 14:56:51'),
(312, 112, 2, '2026-08-26 14:56:55'),
(313, 255, 2, '2026-08-26 14:57:11'),
(314, 73, 2, '2026-08-26 15:06:21'),
(315, 207, 2, '2026-08-26 20:48:30'),
(316, 249, 2, '2026-08-27 11:29:41'),
(317, 248, 2, '2026-08-27 11:29:45'),
(318, 237, 2, '2026-08-27 11:29:50'),
(319, 235, 2, '2026-08-27 11:29:54'),
(320, 287, 2, '2026-08-28 21:49:21'),
(321, 26, 2, '2026-08-28 21:49:30'),
(322, 165, 2, '2026-08-28 21:49:37'),
(323, 87, 2, '2026-08-29 19:14:40'),
(324, 227, 2, '2026-08-29 19:15:06'),
(325, 134, 2, '2026-08-29 19:29:36'),
(326, 28, 2, '2026-08-29 19:41:54'),
(327, 175, 2, '2026-08-29 19:43:15'),
(328, 166, 2, '2026-08-29 19:45:31'),
(329, 113, 2, '2026-08-30 11:21:07'),
(330, 290, 2, '2026-08-30 20:29:59'),
(331, 53, 2, '2026-08-30 21:39:53'),
(332, 52, 2, '2026-08-30 21:42:37'),
(333, 213, 2, '2026-08-30 21:43:15'),
(334, 101, 2, '2026-08-31 19:29:10'),
(335, 146, 2, '2026-08-31 20:30:22'),
(336, 105, 2, '2026-08-31 20:30:25'),
(337, 64, 2, '2026-08-31 20:45:28'),
(338, 290, 2, '2026-08-31 20:47:55'),
(339, 166, 2, '2026-08-31 20:48:08'),
(340, 291, 2, '2026-08-31 20:53:02'),
(341, 51, 2, '2026-08-31 21:23:11'),
(342, 108, 2, '2026-08-31 21:29:52'),
(343, 110, 2, '2026-08-31 21:30:27'),
(344, 102, 2, '2026-08-31 21:33:57'),
(345, 103, 2, '2026-08-31 21:39:50'),
(346, 104, 2, '2026-08-31 21:42:45'),
(347, 109, 2, '2026-08-31 21:44:32'),
(348, 106, 2, '2026-08-31 21:48:06'),
(349, 107, 2, '2026-08-31 21:48:58'),
(350, 53, 2, '2026-08-31 22:10:56'),
(351, 292, 2, '2026-08-31 22:19:43'),
(352, 293, 2, '2026-08-31 22:19:47'),
(353, 297, 2, '2026-08-31 23:06:10'),
(354, 291, 2, '2026-09-02 09:56:01'),
(355, 287, 2, '2026-09-02 13:47:30'),
(356, 85, 2, '2026-09-03 19:35:09'),
(357, 95, 2, '2026-09-03 21:24:32'),
(358, 254, 2, '2026-09-03 21:24:36'),
(359, 187, 2, '2026-09-03 21:46:30'),
(360, 172, 2, '2026-09-03 23:29:01'),
(361, 235, 2, '2026-09-03 23:29:04'),
(362, 59, 2, '2026-09-03 23:36:12'),
(363, 287, 2, '2026-09-05 12:43:46'),
(364, 187, 2, '2026-09-05 12:47:13'),
(365, 38, 2, '2026-09-05 12:47:26'),
(366, 254, 2, '2026-09-05 19:01:53'),
(367, 121, 2, '2026-09-06 10:42:06'),
(370, 27, 2, '2026-09-06 11:20:27'),
(371, 37, 2, '2026-09-06 11:47:13'),
(372, 251, 2, '2026-09-08 10:24:45'),
(373, 298, 2, '2026-09-08 10:27:45'),
(374, 155, 2, '2026-09-08 10:29:55');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_reports`
--

CREATE TABLE `dyscover_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reporter_user_id` bigint(20) UNSIGNED NOT NULL,
  `target_type` enum('post','user') NOT NULL,
  `target_post_id` bigint(20) UNSIGNED DEFAULT NULL,
  `target_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `reason` varchar(64) NOT NULL,
  `details` text DEFAULT NULL,
  `status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
  `review_note` text DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_tags`
--

CREATE TABLE `dyscover_tags` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_tags`
--

INSERT INTO `dyscover_tags` (`id`, `name`, `created_at`, `updated_at`) VALUES
(2, 'image', '2026-08-08 20:15:46', '2026-08-08 20:15:46'),
(10, 'agaritia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(14, 'alveria', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(15, 'azaria', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(16, 'boravia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(17, 'cavallesia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(18, 'comussania', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(19, 'cusea', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(20, 'destenia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(21, 'destenian', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(22, 'armed', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(23, 'forces', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(24, 'destiny', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(25, 'omagu', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(26, 'edrobean', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(27, 'community', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(28, 'fesia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(29, 'jarnovia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(30, 'kashiria', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(31, 'lamberia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(32, 'laocitia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(33, 'law', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(34, 'enforcement', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(35, 'metosia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(36, 'organizations', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(37, 'politics', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(38, 'revolutionaries', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(39, 'ricene', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(40, 'sifalam', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(42, 'stasia', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(43, 'suklan', '2026-08-10 12:20:34', '2026-08-10 12:20:34'),
(44, 'tayanusan', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(45, 'valmirica', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(46, 'verdania', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(47, 'world', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(48, 'union', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(49, 'casari', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(50, 'canal', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(51, 'chairman', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(52, 'court', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(53, 'justice', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(54, 'commission', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(55, 'council', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(56, 'citizens', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(57, 'states', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(58, 'chart', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(59, 'government', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(60, 'chief', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(61, 'criminal', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(62, 'police', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(63, 'financial', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(64, 'national', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(65, 'guard', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(66, 'prison', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(67, 'state', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(68, 'city', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(69, 'marpoli', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(70, 'commander', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(71, 'air', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(72, 'army', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(73, 'navy', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(74, 'coast', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(75, 'comussan', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(76, 'jarnovian', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(77, 'railway', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(78, 'congress', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(79, 'countries', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(80, 'names', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(81, 'democracy', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(82, 'index', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(83, 'deputy', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(84, 'secretary', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(85, 'general', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(86, 'rien', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(87, 'destenians', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(88, 'airmen', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(89, 'force', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(90, 'flag', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(91, 'training', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(92, 'cabinet', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(93, 'meeting', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(94, 'chamber', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(95, 'speaker', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(96, 'relations', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(97, 'elections', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(98, 'fleet', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(99, 'football', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(100, 'team', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(101, 'icbm', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(102, 'military', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(103, 'budget', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(104, 'mons', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(105, 'seal', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(106, 'formation', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(107, 'premiership', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(108, 'presidential', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(109, 'president', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(110, 'senate', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(111, 'soldiers', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(112, 'director', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(113, 'rvlz', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(114, 'news', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(115, 'intelligence', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(116, 'agency', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(117, 'nsa', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(118, 'commissioner', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(119, 'culture', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(120, 'defence', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(121, 'energy', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(122, 'environment', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(123, 'health', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(124, 'infrastructure', '2026-08-10 12:20:35', '2026-08-10 12:20:35'),
(125, 'research', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(126, 'space', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(127, 'social', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(128, 'affairs', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(129, 'telecommunications', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(130, 'trade', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(131, 'migration', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(132, 'emblem', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(133, 'kingdom', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(134, 'federal', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(135, 'unitary', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(136, 'map', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(137, 'first', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(138, 'cassitinia', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(139, 'desupia', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(140, 'distinia', '2026-08-10 12:20:36', '2026-08-10 12:20:36'),
(141, 'litorato', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(142, 'marporto', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(143, 'ostinia', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(144, 'seritinia', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(145, 'daf', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(146, 'valostia', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(147, 'dlu', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(148, 'geo', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(149, 'edrobe', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(150, 'global', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(151, 'political', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(152, 'governor', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(153, 'inspector', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(154, 'leader', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(155, 'youth', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(156, 'logo', '2026-08-10 12:20:37', '2026-08-10 12:20:37'),
(157, 'member', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(158, 'academy', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(159, 'minister', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(160, 'economy', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(161, 'education', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(162, 'enviroment', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(163, 'foreign', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(164, 'interior', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(165, 'sciences', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(166, 'sport', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(167, 'security', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(168, 'mod', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(169, 'parliament', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(170, 'system', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(171, 'prime', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(172, 'prosecutor', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(173, 'regions', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(174, 'religious', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(175, 'skyline', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(176, 'steel', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(177, 'industry', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(178, 'sultan', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(180, 'officer', '2026-08-10 12:20:38', '2026-08-10 12:20:38'),
(181, 'audio', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(182, 'anthem', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(183, 'hymn', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(184, 'revolutionay', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(185, 'war', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(187, 'document', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(188, 'constitution', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(189, 'desteno', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(190, 'agaritian', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(191, 'treaty', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(192, 'charter', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(193, 'template', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(196, 'conflict', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(199, 'country', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(201, 'official', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(203, 'international', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(204, 'organization', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(205, 'person', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(207, 'party', '2026-08-10 12:20:39', '2026-08-10 12:20:39'),
(209, 'armedforces', '2026-08-14 18:29:08', '2026-08-14 18:29:08'),
(211, 'destinyomagu', '2026-08-14 18:29:08', '2026-08-14 18:29:08'),
(212, 'edrobea', '2026-08-14 18:29:08', '2026-08-14 18:29:08'),
(213, 'edrobeancommunity', '2026-08-14 18:29:08', '2026-08-14 18:29:08'),
(214, 'lawenforcement', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(217, 'politicsofdestenia', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(218, 'politicalparty', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(219, 'massorganization', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(220, 'tayanusancommunity', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(221, 'test', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(222, 'worldunion', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(223, 'casaricanal', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(227, 'chiefjusticeofdestenia', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(232, 'cityofmarpoli', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(236, 'countriesnames', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(237, 'democracyindex', '2026-08-14 18:29:09', '2026-08-14 18:29:09'),
(238, 'destenianrien1', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(239, 'destenianairmen', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(245, 'desteniancourt', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(247, 'destenianelections', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(248, 'destenianfleet', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(251, 'destenianicbm', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(254, 'destenianmonsseal', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(255, 'desteniannavyflag', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(257, 'primeminister', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(259, 'office', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(260, 'statesman', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(262, 'destenianrien', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(264, 'destinyomagumeetingsoldiers', '2026-08-14 18:29:10', '2026-08-14 18:29:10'),
(274, 'edrobeanmigration', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(276, 'symbol', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(277, 'emblemofagaritia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(278, 'emblemofalveria', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(279, 'emblemofazaria', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(280, 'emblemofboravia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(281, 'emblemofcavallesia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(282, 'emblemofcomussania', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(283, 'emblemofcusea', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(284, 'emblemofdestenia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(285, 'emblemoffesia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(286, 'emblemofjarnovia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(287, 'emblemofkashiria', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(288, 'emblemoflamberia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(289, 'emblemoflaocitia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(290, 'emblemofmetosia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(291, 'emblemofricene', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(292, 'emblemofricene1', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(293, 'emblemofsifalam', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(294, 'emblemofstasia', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(295, 'emblemofsuklan', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(299, 'emblemofvalmirica', '2026-08-14 18:29:11', '2026-08-14 18:29:11'),
(300, 'emblemofverdania', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(303, 'flagofagaritia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(304, 'flagofalveria', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(305, 'flagofazaria', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(306, 'flagofboravia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(307, 'flagofcassitinia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(308, 'flagofcavallesia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(309, 'flagofcomussania', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(310, 'flagofcusea', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(311, 'flagofdestenia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(312, 'flagofdesupia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(313, 'flagofdistinia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(314, 'flagoffesia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(315, 'flagofjarnovia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(316, 'flagofkashiria', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(317, 'flagoflamberia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(318, 'flagoflaocitia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(319, 'flagoflitorato', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(320, 'flagofmarporto', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(321, 'flagofmetosia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(322, 'flagofostinia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(323, 'flagofricene', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(324, 'flagofseritinia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(325, 'flagofsifalam', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(326, 'flagofstasia', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(327, 'flagofsuklan', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(328, 'flagofthedaf', '2026-08-14 18:29:12', '2026-08-14 18:29:12'),
(332, 'flagofvalmirica', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(333, 'flagofvalostia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(334, 'flagofverdania', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(340, 'globalpoliticalmap', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(342, 'governorofdesupia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(343, 'governoroflitorato', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(344, 'governorofmarporto', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(345, 'governorofostinia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(347, 'governorofvalostia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(348, 'inspectorgeneralofdestenia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(350, 'logoofrvlz', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(352, 'mapofalveria', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(353, 'mapofazaria', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(354, 'mapofboravia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(357, 'mapofcusea', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(359, 'mapoffesia', '2026-08-14 18:29:13', '2026-08-14 18:29:13'),
(364, 'mapofmetosia', '2026-08-14 18:29:14', '2026-08-14 18:29:14'),
(365, 'mapofricene', '2026-08-14 18:29:14', '2026-08-14 18:29:14'),
(366, 'mapofsifalam', '2026-08-14 18:29:14', '2026-08-14 18:29:14'),
(367, 'mapofstasia', '2026-08-14 18:29:14', '2026-08-14 18:29:14'),
(368, 'mapofsuklan', '2026-08-14 18:29:14', '2026-08-14 18:29:14'),
(386, 'politicalsystemofthecountries', '2026-08-14 18:29:15', '2026-08-14 18:29:15'),
(387, 'portrait', '2026-08-14 18:29:15', '2026-08-14 18:29:15'),
(408, 'prosecutorgeneralofdestenia', '2026-08-14 18:29:15', '2026-08-14 18:29:15'),
(409, 'regionsofdestenia', '2026-08-14 18:29:15', '2026-08-14 18:29:15'),
(413, 'skylineofdistinia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(414, 'steelindustryindestenia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(415, 'sultanofsifalam', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(418, 'anthemofagaritia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(419, 'anthemofboravia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(420, 'anthemofcomussania', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(421, 'anthemofcusea', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(422, 'anthemofdestenia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(423, 'anthemoffesia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(424, 'anthemofjarnovia', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(425, 'anthemofkashiria', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(427, 'hymnoftheworldunion', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(433, 'worldunioncharter', '2026-08-14 18:29:16', '2026-08-14 18:29:16'),
(435, 'internationalorganization', '2026-08-14 18:42:09', '2026-08-14 18:42:09'),
(436, 'tayanusa', '2026-08-14 18:42:40', '2026-08-14 18:42:40'),
(437, 'regionalorganization', '2026-08-14 18:42:40', '2026-08-14 18:42:40'),
(438, 'litheria', '2026-08-14 18:47:42', '2026-08-14 18:47:42'),
(439, 'airforce', '2026-08-14 18:49:42', '2026-08-14 18:49:42'),
(440, 'unitedstatesofvalmirica', '2026-08-14 19:11:20', '2026-08-14 19:11:20'),
(441, 'usv', '2026-08-14 19:11:20', '2026-08-14 19:11:20'),
(442, 'headofstate', '2026-08-14 22:58:57', '2026-08-14 22:58:57'),
(443, 'unitednations', '2026-08-15 00:17:55', '2026-08-15 00:17:55'),
(444, 'tournament', '2026-08-15 13:43:09', '2026-08-15 13:43:09'),
(445, 'cup', '2026-08-15 13:43:09', '2026-08-15 13:43:09'),
(446, 'worldcup', '2026-08-15 14:01:37', '2026-08-15 14:01:37'),
(447, 'wff', '2026-08-15 14:01:37', '2026-08-15 14:01:37'),
(448, 'headofgovernment', '2026-08-16 21:05:29', '2026-08-16 21:05:29'),
(449, 'destenianlabourunion', '2026-08-26 12:26:34', '2026-08-26 12:26:34'),
(450, 'destenianarmedforces', '2026-08-26 12:57:42', '2026-08-26 12:57:42'),
(451, 'assembly', '2026-08-30 21:42:34', '2026-08-30 21:42:34'),
(452, 'socialaffairs', '2026-08-30 21:50:54', '2026-08-30 21:50:54'),
(453, 'maritime', '2026-08-31 22:21:20', '2026-08-31 22:21:20'),
(454, 'cybersecurity', '2026-08-31 22:24:05', '2026-08-31 22:24:05'),
(455, 'border', '2026-08-31 22:54:13', '2026-08-31 22:54:13'),
(456, 'statistics', '2026-09-01 13:47:48', '2026-09-01 13:47:48'),
(457, 'mari', '2026-09-01 13:50:00', '2026-09-01 13:50:00'),
(458, 'judiciary', '2026-09-03 23:25:16', '2026-09-03 23:25:16'),
(459, 'workforward', '2026-09-03 23:28:44', '2026-09-03 23:28:44'),
(460, 'labour', '2026-09-03 23:28:44', '2026-09-03 23:28:44');

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_template_fields`
--

CREATE TABLE `dyscover_template_fields` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `template_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('single-image','large-image','double-image','definition','text','double-column','double-column-extended') NOT NULL,
  `position` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_template_fields`
--

INSERT INTO `dyscover_template_fields` (`id`, `template_id`, `name`, `type`, `position`) VALUES
(6, 278, 'Image', 'single-image', 0),
(7, 278, 'Formed', 'text', 1),
(8, 278, 'Type', 'text', 2),
(9, 278, 'Allegiance', 'text', 3),
(10, 278, 'Jurisdiction', 'text', 4),
(11, 278, 'Headquarters', 'text', 5),
(12, 278, 'Employees', 'text', 6),
(13, 278, 'Annual budget', 'text', 7),
(14, 278, 'Leadership', 'double-column', 8),
(15, 278, 'Preceding agencies', 'text', 9),
(16, 278, 'Parent agency', 'text', 10),
(17, 278, 'Child agencies', 'text', 11),
(18, 279, 'Image', 'single-image', 0),
(19, 279, 'Date', 'text', 1),
(20, 279, 'Location', 'text', 2),
(21, 279, 'Result', 'text', 3),
(22, 279, 'Territorial changes', 'text', 4),
(23, 279, 'Participants', 'double-column', 5),
(24, 279, 'Commanders and leaders', 'double-column', 6),
(25, 279, 'Strength', 'double-column', 7),
(26, 279, 'Casualties', 'double-column', 8),
(27, 280, 'Flag and emblem', 'single-image', 0),
(28, 280, 'Motto', 'definition', 1),
(29, 280, 'Anthem', 'definition', 2),
(30, 280, 'Map', 'large-image', 3),
(31, 280, 'Capital city', 'text', 4),
(32, 280, 'Part of', 'text', 5),
(33, 280, 'Official languages', 'text', 6),
(34, 280, 'Ethnic groups', 'text', 7),
(35, 280, 'Religion', 'text', 8),
(36, 280, 'Demonym', 'text', 9),
(37, 280, 'Type', 'text', 10),
(38, 280, 'Government', 'text', 11),
(39, 280, 'Leadership', 'double-column-extended', 12),
(40, 280, 'Legislature', 'text', 13),
(41, 280, 'Legislature chambers', 'double-column-extended', 14),
(42, 280, 'Constituencies', 'text', 15),
(43, 280, 'Formation', 'double-column', 16),
(44, 280, 'Area', 'text', 17),
(45, 280, 'Population', 'text', 18),
(46, 280, 'Currency', 'text', 19),
(47, 280, 'GDP', 'text', 20),
(48, 280, 'Preceded by', 'text', 21),
(49, 280, 'Succeeded by', 'text', 22),
(50, 281, 'Image', 'single-image', 0),
(51, 281, 'Incumbent', 'text', 1),
(52, 281, 'Style', 'text', 2),
(53, 281, 'Type', 'text', 3),
(54, 281, 'Abbreviation', 'text', 4),
(56, 281, 'Reports to', 'text', 6),
(57, 281, 'Seat', 'text', 7),
(58, 281, 'Nominator', 'text', 8),
(59, 281, 'Appointer', 'text', 9),
(60, 281, 'Term length', 'text', 10),
(61, 281, 'Constituting instrument', 'text', 11),
(62, 281, 'Precursor', 'text', 12),
(63, 281, 'Formation', 'double-column', 13),
(64, 281, 'First holder', 'text', 14),
(65, 281, 'Unofficial names', 'text', 15),
(66, 281, 'Deputy', 'text', 16),
(67, 281, 'Salary', 'text', 17),
(69, 282, 'Anthem', 'definition', 1),
(70, 282, 'Motto', 'definition', 2),
(72, 282, 'Headquarters', 'text', 4),
(73, 282, 'Official languages', 'text', 5),
(74, 282, 'Founded', 'text', 6),
(75, 282, 'Dissolved', 'text', 7),
(76, 282, 'Type', 'text', 8),
(77, 282, 'Leadership', 'double-column', 9),
(78, 282, 'Membership', 'text', 10),
(79, 282, 'Formation', 'double-column', 11),
(80, 282, 'Observers', 'text', 12),
(81, 282, 'Parent organization', 'text', 13),
(82, 282, 'Child organizations', 'text', 14),
(83, 282, 'Affiliations', 'text', 15),
(84, 282, 'Predecessor', 'text', 16),
(85, 282, 'Successor', 'text', 17),
(86, 283, 'Flag and emblem', 'single-image', 0),
(87, 283, 'Motto', 'definition', 1),
(88, 283, 'Anthem', 'definition', 2),
(89, 283, 'Founded', 'text', 3),
(90, 283, 'Allegiance', 'text', 4),
(91, 283, 'Service branches', 'text', 5),
(92, 283, 'Headquarters', 'text', 6),
(93, 283, 'Leadership', 'double-column', 7),
(94, 283, 'Military age', 'text', 8),
(95, 283, 'Conscription', 'text', 9),
(96, 283, 'Available for military service', 'text', 10),
(97, 283, 'Active personnel', 'text', 11),
(98, 283, 'Reserve personnel', 'text', 12),
(99, 283, 'Budget', 'text', 13),
(100, 283, 'Domestic suppliers', 'text', 14),
(101, 283, 'Foreign suppliers', 'text', 15),
(102, 283, 'History', '', 16),
(103, 283, 'Wars', 'text', 17),
(104, 283, 'Ranks', 'text', 18),
(105, 284, 'Image', 'single-image', 0),
(106, 284, 'Other names', 'text', 1),
(107, 284, 'Born', 'text', 2),
(108, 284, 'Died', 'text', 3),
(109, 284, 'Nationality', 'text', 4),
(110, 284, 'Occupation', 'text', 5),
(111, 284, 'Positions', 'double-column', 6),
(112, 284, 'Spouse', 'text', 7),
(113, 284, 'Children', 'text', 8),
(114, 284, 'Relatives', 'text', 9),
(115, 284, 'Residence', 'text', 10),
(116, 284, 'Education', 'text', 11),
(117, 284, 'Awards', 'text', 12),
(118, 284, 'Political party', 'text', 13),
(119, 284, 'Other political affiliations', 'text', 14),
(120, 284, 'Allegiance', 'text', 15),
(121, 284, 'Branch', 'text', 16),
(122, 284, 'Years active', 'text', 17),
(123, 284, 'Rank', 'text', 18),
(124, 284, 'Wars', 'text', 19),
(125, 284, 'Signature', '', 20),
(126, 285, 'Image', 'single-image', 0),
(127, 285, 'Abbreviation', 'text', 1),
(128, 285, 'Leader', 'text', 2),
(129, 285, 'Secretary', 'text', 3),
(130, 285, 'Founded', 'text', 4),
(131, 285, 'Founders', 'text', 5),
(132, 285, 'Headquarters', 'text', 6),
(133, 285, 'Country', 'text', 7),
(134, 285, 'Newspaper', 'text', 8),
(135, 285, 'Youth wing', 'text', 9),
(136, 285, 'Student wing', 'text', 10),
(137, 285, 'Armed wing', 'text', 11),
(138, 285, 'Women wing', 'text', 12),
(139, 285, 'Membership', 'text', 13),
(140, 285, 'Ideology', 'text', 14),
(141, 285, 'Political position', 'text', 15),
(142, 285, 'International affiliation', 'text', 16),
(143, 285, 'Colours', 'text', 17),
(144, 285, 'Slogan', 'definition', 18),
(145, 285, 'Anthem', 'definition', 19),
(146, 285, 'Government', 'text', 20),
(147, 285, 'Flag', 'single-image', 21),
(148, 285, 'Preceded by', 'text', 22),
(149, 285, 'Succeeded by', 'text', 23),
(150, 282, 'Logo', 'single-image', 0),
(152, 282, 'Map', 'large-image', 3),
(153, 281, 'Part of institutions', 'text', 5),
(154, 286, 'Host country', 'text', 1),
(155, 286, 'Dates', 'text', 2),
(156, 286, 'Teams', 'text', 3),
(157, 286, 'Venues', 'text', 4),
(158, 286, 'Champions', 'text', 5),
(159, 286, 'Runners-up', 'text', 6),
(160, 286, 'Third place', 'text', 7),
(161, 286, 'Fourth place', 'text', 8),
(162, 286, 'Matches played', 'text', 9),
(163, 286, 'Goals scored', 'text', 10),
(164, 286, 'Attendance', 'text', 11),
(165, 286, 'Top scorer', 'text', 12),
(166, 286, 'Best player', 'text', 13),
(167, 286, 'Best young player', 'text', 14),
(168, 286, 'Best goalkeeper', 'text', 15),
(169, 286, 'Fair play award', 'text', 16),
(170, 286, 'Preceded by', 'text', 17),
(171, 286, 'Succeded by', 'text', 18),
(172, 286, 'Logo', 'single-image', 0);

-- --------------------------------------------------------

--
-- Struttura della tabella `dyscover_users`
--

CREATE TABLE `dyscover_users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `account_id` bigint(20) UNSIGNED NOT NULL,
  `biography` text DEFAULT NULL,
  `role` enum('user','moderator') NOT NULL DEFAULT 'user',
  `status` enum('active','suspended','banned') NOT NULL DEFAULT 'active',
  `suspended_until` datetime DEFAULT NULL,
  `ban_reason` text DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `dyscover_users`
--

INSERT INTO `dyscover_users` (`id`, `account_id`, `biography`, `role`, `status`, `suspended_until`, `ban_reason`, `website`, `created_at`, `updated_at`) VALUES
(1, 1, 'Knowledge is Power', 'user', 'active', NULL, NULL, NULL, '2026-08-08 17:31:40', '2026-08-09 18:36:58'),
(2, 2, 'founder of @ielectro', 'user', 'active', NULL, NULL, 'https://www.instagram.com/tduttisot/', '2026-08-08 17:53:51', '2026-08-09 20:09:50'),
(3, 3, '', 'user', 'active', NULL, NULL, '', '2026-08-09 19:25:55', '2026-08-12 12:28:58'),
(4, 4, '', 'user', 'active', NULL, NULL, '', '2026-08-09 20:07:14', '2026-08-09 20:07:39');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `dyscover_activity`
--
ALTER TABLE `dyscover_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_recipient` (`recipient_id`),
  ADD KEY `idx_activity_actor` (`actor_id`),
  ADD KEY `idx_activity_post` (`post_id`),
  ADD KEY `idx_activity_group` (`group_id`),
  ADD KEY `idx_activity_type` (`type`),
  ADD KEY `idx_activity_read` (`viewed_at`),
  ADD KEY `idx_activity_created` (`created_at`);

--
-- Indici per le tabelle `dyscover_banned_terms`
--
ALTER TABLE `dyscover_banned_terms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_banned_term` (`term`);

--
-- Indici per le tabelle `dyscover_follows`
--
ALTER TABLE `dyscover_follows`
  ADD PRIMARY KEY (`follower_id`,`followed_id`),
  ADD KEY `idx_follows_followed` (`followed_id`);

--
-- Indici per le tabelle `dyscover_groups`
--
ALTER TABLE `dyscover_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_groups_creator` (`creator_id`),
  ADD KEY `idx_groups_visibility` (`visibility`);

--
-- Indici per le tabelle `dyscover_group_members`
--
ALTER TABLE `dyscover_group_members`
  ADD PRIMARY KEY (`group_id`,`user_id`),
  ADD KEY `idx_group_members_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_inbox_chats`
--
ALTER TABLE `dyscover_inbox_chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chats_group` (`group_id`),
  ADD KEY `idx_chats_updated` (`updated_at`);

--
-- Indici per le tabelle `dyscover_inbox_members`
--
ALTER TABLE `dyscover_inbox_members`
  ADD PRIMARY KEY (`chat_id`,`user_id`),
  ADD KEY `idx_inbox_members_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_inbox_messages`
--
ALTER TABLE `dyscover_inbox_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messages_chat` (`chat_id`),
  ADD KEY `idx_messages_sender` (`sender_id`),
  ADD KEY `idx_messages_post` (`post_id`),
  ADD KEY `idx_messages_reply` (`reply_to_id`),
  ADD KEY `idx_messages_created` (`created_at`);

--
-- Indici per le tabelle `dyscover_inbox_message_hides`
--
ALTER TABLE `dyscover_inbox_message_hides`
  ADD PRIMARY KEY (`message_id`,`user_id`),
  ADD KEY `idx_message_hides_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_inbox_message_reads`
--
ALTER TABLE `dyscover_inbox_message_reads`
  ADD PRIMARY KEY (`message_id`,`user_id`),
  ADD KEY `idx_message_reads_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_posts`
--
ALTER TABLE `dyscover_posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_posts_uuid` (`uuid`),
  ADD KEY `idx_posts_uuid` (`uuid`),
  ADD KEY `idx_posts_user` (`user_id`),
  ADD KEY `idx_posts_type` (`type`),
  ADD KEY `idx_posts_visibility` (`visibility`),
  ADD KEY `idx_posts_status` (`status`),
  ADD KEY `idx_posts_published` (`published_at`),
  ADD KEY `idx_posts_updated` (`updated_at`);

--
-- Indici per le tabelle `dyscover_post_bookmarks`
--
ALTER TABLE `dyscover_post_bookmarks`
  ADD PRIMARY KEY (`post_id`,`user_id`),
  ADD KEY `idx_post_bookmarks_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_comments`
--
ALTER TABLE `dyscover_post_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post_comments_post` (`post_id`),
  ADD KEY `idx_post_comments_user` (`user_id`),
  ADD KEY `idx_post_comments_status` (`status`),
  ADD KEY `idx_post_comments_created` (`created_at`),
  ADD KEY `idx_post_comments_parent` (`parent_id`);

--
-- Indici per le tabelle `dyscover_post_comment_likes`
--
ALTER TABLE `dyscover_post_comment_likes`
  ADD PRIMARY KEY (`comment_id`,`user_id`),
  ADD KEY `idx_post_comment_likes_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_likes`
--
ALTER TABLE `dyscover_post_likes`
  ADD PRIMARY KEY (`post_id`,`user_id`),
  ADD KEY `idx_post_likes_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_mentions`
--
ALTER TABLE `dyscover_post_mentions`
  ADD PRIMARY KEY (`post_id`,`user_id`),
  ADD KEY `idx_post_mentions_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_reposts`
--
ALTER TABLE `dyscover_post_reposts`
  ADD PRIMARY KEY (`post_id`,`user_id`),
  ADD KEY `idx_post_reposts_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_shares`
--
ALTER TABLE `dyscover_post_shares`
  ADD PRIMARY KEY (`post_id`,`user_id`),
  ADD KEY `idx_post_shares_user` (`user_id`);

--
-- Indici per le tabelle `dyscover_post_statistics`
--
ALTER TABLE `dyscover_post_statistics`
  ADD PRIMARY KEY (`post_id`);

--
-- Indici per le tabelle `dyscover_post_tags`
--
ALTER TABLE `dyscover_post_tags`
  ADD PRIMARY KEY (`post_id`,`tag_id`),
  ADD KEY `idx_post_tags_tag` (`tag_id`);

--
-- Indici per le tabelle `dyscover_post_views`
--
ALTER TABLE `dyscover_post_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post_views_post` (`post_id`),
  ADD KEY `idx_post_views_user` (`user_id`),
  ADD KEY `idx_post_views_created` (`created_at`);

--
-- Indici per le tabelle `dyscover_reports`
--
ALTER TABLE `dyscover_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reports_status` (`status`),
  ADD KEY `idx_reports_target_post` (`target_post_id`),
  ADD KEY `idx_reports_target_user` (`target_user_id`),
  ADD KEY `idx_reports_reporter` (`reporter_user_id`),
  ADD KEY `idx_reports_created` (`created_at`);

--
-- Indici per le tabelle `dyscover_tags`
--
ALTER TABLE `dyscover_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tag_name` (`name`);

--
-- Indici per le tabelle `dyscover_template_fields`
--
ALTER TABLE `dyscover_template_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_template_fields_template` (`template_id`);

--
-- Indici per le tabelle `dyscover_users`
--
ALTER TABLE `dyscover_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_account` (`account_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `dyscover_activity`
--
ALTER TABLE `dyscover_activity`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT per la tabella `dyscover_banned_terms`
--
ALTER TABLE `dyscover_banned_terms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `dyscover_groups`
--
ALTER TABLE `dyscover_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `dyscover_inbox_chats`
--
ALTER TABLE `dyscover_inbox_chats`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT per la tabella `dyscover_inbox_messages`
--
ALTER TABLE `dyscover_inbox_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT per la tabella `dyscover_posts`
--
ALTER TABLE `dyscover_posts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=306;

--
-- AUTO_INCREMENT per la tabella `dyscover_post_comments`
--
ALTER TABLE `dyscover_post_comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT per la tabella `dyscover_post_views`
--
ALTER TABLE `dyscover_post_views`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=375;

--
-- AUTO_INCREMENT per la tabella `dyscover_reports`
--
ALTER TABLE `dyscover_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `dyscover_tags`
--
ALTER TABLE `dyscover_tags`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=461;

--
-- AUTO_INCREMENT per la tabella `dyscover_template_fields`
--
ALTER TABLE `dyscover_template_fields`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=173;

--
-- AUTO_INCREMENT per la tabella `dyscover_users`
--
ALTER TABLE `dyscover_users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `dyscover_activity`
--
ALTER TABLE `dyscover_activity`
  ADD CONSTRAINT `dyscover_activity_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_activity_ibfk_2` FOREIGN KEY (`actor_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_activity_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_activity_ibfk_4` FOREIGN KEY (`group_id`) REFERENCES `dyscover_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_follows`
--
ALTER TABLE `dyscover_follows`
  ADD CONSTRAINT `dyscover_follows_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_follows_ibfk_2` FOREIGN KEY (`followed_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_groups`
--
ALTER TABLE `dyscover_groups`
  ADD CONSTRAINT `dyscover_groups_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_group_members`
--
ALTER TABLE `dyscover_group_members`
  ADD CONSTRAINT `dyscover_group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `dyscover_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_inbox_chats`
--
ALTER TABLE `dyscover_inbox_chats`
  ADD CONSTRAINT `dyscover_inbox_chats_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `dyscover_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_inbox_members`
--
ALTER TABLE `dyscover_inbox_members`
  ADD CONSTRAINT `dyscover_inbox_members_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `dyscover_inbox_chats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_inbox_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_inbox_messages`
--
ALTER TABLE `dyscover_inbox_messages`
  ADD CONSTRAINT `dyscover_inbox_messages_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `dyscover_inbox_chats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_inbox_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_inbox_messages_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_inbox_messages_ibfk_4` FOREIGN KEY (`reply_to_id`) REFERENCES `dyscover_inbox_messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_inbox_message_hides`
--
ALTER TABLE `dyscover_inbox_message_hides`
  ADD CONSTRAINT `dyscover_inbox_message_hides_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `dyscover_inbox_messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_inbox_message_hides_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_inbox_message_reads`
--
ALTER TABLE `dyscover_inbox_message_reads`
  ADD CONSTRAINT `dyscover_message_reads_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `dyscover_inbox_messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_message_reads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_posts`
--
ALTER TABLE `dyscover_posts`
  ADD CONSTRAINT `dyscover_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_bookmarks`
--
ALTER TABLE `dyscover_post_bookmarks`
  ADD CONSTRAINT `dyscover_post_bookmarks_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_bookmarks_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_comments`
--
ALTER TABLE `dyscover_post_comments`
  ADD CONSTRAINT `dyscover_post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `dyscover_post_comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_comment_likes`
--
ALTER TABLE `dyscover_post_comment_likes`
  ADD CONSTRAINT `dyscover_post_comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `dyscover_post_comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_likes`
--
ALTER TABLE `dyscover_post_likes`
  ADD CONSTRAINT `dyscover_post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_mentions`
--
ALTER TABLE `dyscover_post_mentions`
  ADD CONSTRAINT `dyscover_post_mentions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_mentions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_reposts`
--
ALTER TABLE `dyscover_post_reposts`
  ADD CONSTRAINT `dyscover_post_reposts_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_reposts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_shares`
--
ALTER TABLE `dyscover_post_shares`
  ADD CONSTRAINT `dyscover_post_shares_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_statistics`
--
ALTER TABLE `dyscover_post_statistics`
  ADD CONSTRAINT `dyscover_post_statistics_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_tags`
--
ALTER TABLE `dyscover_post_tags`
  ADD CONSTRAINT `dyscover_post_tags_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `dyscover_tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_post_views`
--
ALTER TABLE `dyscover_post_views`
  ADD CONSTRAINT `dyscover_post_views_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_post_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_reports`
--
ALTER TABLE `dyscover_reports`
  ADD CONSTRAINT `dyscover_reports_ibfk_1` FOREIGN KEY (`reporter_user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_reports_ibfk_2` FOREIGN KEY (`target_post_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dyscover_reports_ibfk_3` FOREIGN KEY (`target_user_id`) REFERENCES `dyscover_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dyscover_template_fields`
--
ALTER TABLE `dyscover_template_fields`
  ADD CONSTRAINT `dyscover_template_fields_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `dyscover_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
