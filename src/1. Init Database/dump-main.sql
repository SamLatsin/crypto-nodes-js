--
-- NOTE:
--
-- File paths need to be edited. Search for $$PATH$$ and
-- replace it with the path to the directory containing
-- the extracted data files.
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.0 (Debian 15.0-1.pgdg110+1)
-- Dumped by pg_dump version 15.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE main;
--
-- Name: main; Type: DATABASE; Schema: -; Owner: admin
--

CREATE DATABASE main WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE main OWNER TO admin;

-- \connect main

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btc_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.btc_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.btc_seq OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: btc; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.btc (
    id integer DEFAULT nextval('public.btc_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    address character varying(64) NOT NULL,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.btc OWNER TO admin;

--
-- Name: eth_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.eth_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eth_seq OWNER TO admin;

--
-- Name: eth; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.eth (
    id integer DEFAULT nextval('public.eth_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    address character varying(64) NOT NULL,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.eth OWNER TO admin;

--
-- Name: recover_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.recover_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recover_seq OWNER TO admin;

--
-- Name: recover_queue; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.recover_queue (
    id integer DEFAULT nextval('public.recover_seq'::regclass) NOT NULL,
    ticker character varying(10) NOT NULL,
    name character varying(64) NOT NULL,
    recovering integer DEFAULT 0 NOT NULL,
    startheight integer,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.recover_queue OWNER TO admin;

--
-- Name: trx_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.trx_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.trx_seq OWNER TO admin;

--
-- Name: trx; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.trx (
    id integer DEFAULT nextval('public.trx_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    address character varying(64) NOT NULL,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trx OWNER TO admin;

--
-- Name: wallet_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.wallet_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallet_seq OWNER TO admin;

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.wallets (
    id integer DEFAULT nextval('public.wallet_seq'::regclass) NOT NULL,
    ticker character varying(10) NOT NULL,
    name character varying(64) NOT NULL,
    "privateKey" character varying(128) NOT NULL,
    mnemonic character varying(1024) NOT NULL,
    "walletToken" character varying(128) NOT NULL,
    "lastSync" timestamp with time zone,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.wallets OWNER TO admin;

--
-- Name: zcash_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.zcash_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.zcash_seq OWNER TO admin;

--
-- Name: zcash; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.zcash (
    id integer DEFAULT nextval('public.zcash_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    address character varying(64) NOT NULL,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.zcash OWNER TO admin;

--
-- Name: zcasht_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.zcasht_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.zcasht_seq OWNER TO admin;

--
-- Name: zcasht; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.zcasht (
    id integer DEFAULT nextval('public.zcasht_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    address character varying(64) NOT NULL,
    date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.zcasht OWNER TO admin;

--
-- Name: btc_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.btc_seq', 1, true);


--
-- Name: eth_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.eth_seq', 1, false);


--
-- Name: recover_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.recover_seq', 1, false);


--
-- Name: trx_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.trx_seq', 1, false);


--
-- Name: wallet_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.wallet_seq', 1, true);


--
-- Name: zcash_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.zcash_seq', 1, false);


--
-- Name: zcasht_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.zcasht_seq', 1, false);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

