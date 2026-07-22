--
-- PostgreSQL database dump
--

\restrict bn9oDncvz3r1RrtBHdVcLwWyDkid1fFaEPDuHh43nanOAAf0fnOifcoxJg2rHq7

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: appraisal_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appraisal_answers (
    id integer NOT NULL,
    request_id integer NOT NULL,
    question_id integer NOT NULL,
    answer text NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.appraisal_answers OWNER TO postgres;

--
-- Name: appraisal_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appraisal_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appraisal_answers_id_seq OWNER TO postgres;

--
-- Name: appraisal_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appraisal_answers_id_seq OWNED BY public.appraisal_answers.id;


--
-- Name: appraisal_cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appraisal_cycles (
    id integer NOT NULL,
    title character varying(100) NOT NULL,
    appraisal_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.appraisal_cycles OWNER TO postgres;

--
-- Name: appraisal_cycles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appraisal_cycles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appraisal_cycles_id_seq OWNER TO postgres;

--
-- Name: appraisal_cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appraisal_cycles_id_seq OWNED BY public.appraisal_cycles.id;


--
-- Name: appraisal_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appraisal_questions (
    id integer NOT NULL,
    appraisal_year integer NOT NULL,
    role_name character varying(100) NOT NULL,
    question text NOT NULL,
    is_active boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.appraisal_questions OWNER TO postgres;

--
-- Name: appraisal_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appraisal_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appraisal_questions_id_seq OWNER TO postgres;

--
-- Name: appraisal_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appraisal_questions_id_seq OWNED BY public.appraisal_questions.id;


--
-- Name: appraisal_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appraisal_requests (
    id integer NOT NULL,
    cycle_id integer NOT NULL,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(200) NOT NULL,
    role character varying(100) NOT NULL,
    reporting_manager character varying(200) NOT NULL,
    status character varying(30),
    rating character varying(30),
    score integer,
    manager_comment text,
    submitted_at timestamp without time zone,
    reviewed_at timestamp without time zone
);


ALTER TABLE public.appraisal_requests OWNER TO postgres;

--
-- Name: appraisal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appraisal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appraisal_requests_id_seq OWNER TO postgres;

--
-- Name: appraisal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appraisal_requests_id_seq OWNED BY public.appraisal_requests.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    lunch_break boolean,
    lunch_start timestamp without time zone,
    lunch_end timestamp without time zone,
    lunch_minutes integer,
    tea_break boolean,
    tea_start timestamp without time zone,
    tea_end timestamp without time zone,
    tea_minutes integer,
    total_break_minutes integer,
    total_gap_minutes integer,
    total_hours double precision,
    attendance_date date,
    status character varying(20),
    shift_timing character varying(50),
    manager_status character varying(20)
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: birthday_wishes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.birthday_wishes (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone,
    status character varying(50),
    thanked boolean,
    thanked_at timestamp without time zone
);


ALTER TABLE public.birthday_wishes OWNER TO postgres;

--
-- Name: birthday_wishes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.birthday_wishes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.birthday_wishes_id_seq OWNER TO postgres;

--
-- Name: birthday_wishes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.birthday_wishes_id_seq OWNED BY public.birthday_wishes.id;


--
-- Name: communications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communications (
    id integer NOT NULL,
    employee_id integer,
    receiver_id integer,
    employee_name character varying(200),
    message_type character varying(50) NOT NULL,
    title character varying(255),
    target_role character varying(50),
    message text NOT NULL,
    created_by character varying(200),
    created_at timestamp without time zone,
    likes json DEFAULT '[]'::json
);


ALTER TABLE public.communications OWNER TO postgres;

--
-- Name: communications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.communications_id_seq OWNER TO postgres;

--
-- Name: communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.communications_id_seq OWNED BY public.communications.id;


--
-- Name: employee_leave_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_leave_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type character varying(100) NOT NULL,
    available double precision NOT NULL
);


ALTER TABLE public.employee_leave_balances OWNER TO postgres;

--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_leave_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_leave_balances_id_seq OWNER TO postgres;

--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_leave_balances_id_seq OWNED BY public.employee_leave_balances.id;


--
-- Name: employee_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_notifications (
    id integer NOT NULL,
    receiver_name character varying(200) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean,
    created_at timestamp without time zone,
    related_id integer,
    related_type character varying(50),
    notification_type character varying(50),
    status character varying(50),
    action_required boolean,
    resolved boolean,
    resolved_at timestamp without time zone
);


ALTER TABLE public.employee_notifications OWNER TO postgres;

--
-- Name: employee_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_notifications_id_seq OWNER TO postgres;

--
-- Name: employee_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_notifications_id_seq OWNED BY public.employee_notifications.id;


--
-- Name: employee_performance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_performance (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    department character varying(200) NOT NULL,
    designation character varying(200) NOT NULL,
    review_period character varying(100) NOT NULL,
    efficiency integer,
    quality integer,
    productivity integer,
    attendance integer,
    rating character varying(50),
    goals text,
    feedback text,
    reviewer character varying(200),
    review_date character varying(50),
    created_at timestamp without time zone
);


ALTER TABLE public.employee_performance OWNER TO postgres;

--
-- Name: employee_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_performance_id_seq OWNER TO postgres;

--
-- Name: employee_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_performance_id_seq OWNED BY public.employee_performance.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer,
    profile_image bytea,
    employee_id character varying(50),
    first_name character varying(100),
    last_name character varying(100),
    email character varying(150),
    phone character varying(20),
    alternate_phone character varying(20),
    dob date,
    gender character varying(20),
    marital_status character varying(30),
    blood_group character varying(10),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    pincode character varying(20),
    department character varying(100),
    designation character varying(100),
    joining_date date,
    reporting_manager character varying(100),
    salary double precision,
    sick_leave double precision,
    casual_leave double precision,
    privilege_leave double precision,
    last_leave_reset_month character varying(10),
    last_leave_reset_year integer,
    bank_name character varying(150),
    account_number character varying(50),
    ifsc_code character varying(20),
    pan_number character varying(20),
    aadhaar_number character varying(20),
    qualification character varying(200),
    college character varying(200),
    passing_year character varying(10),
    percentage character varying(20),
    tenth_school character varying(200),
    tenth_percentage character varying(20),
    twelfth_school character varying(200),
    twelfth_percentage character varying(20),
    ug_degree character varying(200),
    ug_college character varying(200),
    ug_percentage character varying(20),
    pg_degree character varying(200),
    pg_college character varying(200),
    pg_percentage character varying(20),
    pf_number character varying(50),
    uan_number character varying(50),
    esi_number character varying(50),
    tenth_board character varying(50),
    twelfth_board character varying(50),
    ug_university character varying(200),
    pg_university character varying(200),
    total_experience character varying(50),
    previous_company character varying(200),
    current_ctc double precision,
    expected_ctc double precision,
    notice_period character varying(50),
    skills text,
    employee_type character varying(50),
    work_location character varying(100),
    shift_timing character varying(100),
    probation_end_date date,
    resume_file bytea,
    aadhaar_file bytea,
    pan_file bytea,
    degree_certificate bytea,
    emergency_contact_name character varying(150),
    emergency_contact_number character varying(20),
    emergency_contact_relation character varying(50),
    status character varying(20),
    profile_completed boolean,
    is_first_login boolean,
    team_id integer,
    salary_paid boolean,
    salary_paid_date timestamp without time zone
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: holiday_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holiday_overrides (
    id integer NOT NULL,
    date date NOT NULL,
    override_type character varying(50) NOT NULL,
    name character varying(200),
    holiday_type character varying(100)
);


ALTER TABLE public.holiday_overrides OWNER TO postgres;

--
-- Name: holiday_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holiday_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.holiday_overrides_id_seq OWNER TO postgres;

--
-- Name: holiday_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holiday_overrides_id_seq OWNED BY public.holiday_overrides.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    date date NOT NULL,
    day character varying(50) NOT NULL,
    holiday_type character varying(100) NOT NULL,
    is_published boolean
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: leave_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_audit_logs (
    id integer NOT NULL,
    leave_id integer NOT NULL,
    employee_name character varying(200) NOT NULL,
    action character varying(250) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    cancelled_at timestamp without time zone,
    cancelled_by character varying(100)
);


ALTER TABLE public.leave_audit_logs OWNER TO postgres;

--
-- Name: leave_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leave_audit_logs_id_seq OWNER TO postgres;

--
-- Name: leave_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_audit_logs_id_seq OWNED BY public.leave_audit_logs.id;


--
-- Name: leave_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_ledger (
    id integer NOT NULL,
    employee_id character varying(50),
    month character varying(20),
    year integer,
    opening_cl double precision,
    opening_sl double precision,
    opening_pl double precision,
    credit_cl double precision,
    credit_sl double precision,
    credit_pl double precision,
    taken_cl double precision,
    taken_sl double precision,
    taken_pl double precision,
    closing_cl double precision,
    closing_sl double precision,
    closing_pl double precision
);


ALTER TABLE public.leave_ledger OWNER TO postgres;

--
-- Name: leave_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leave_ledger_id_seq OWNER TO postgres;

--
-- Name: leave_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_ledger_id_seq OWNED BY public.leave_ledger.id;


--
-- Name: leave_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_policies (
    id integer NOT NULL,
    leave_type character varying(100) NOT NULL,
    yearly_limit double precision NOT NULL,
    applicable_gender character varying(20) DEFAULT 'All'::character varying NOT NULL
);


ALTER TABLE public.leave_policies OWNER TO postgres;

--
-- Name: leave_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leave_policies_id_seq OWNER TO postgres;

--
-- Name: leave_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_policies_id_seq OWNED BY public.leave_policies.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    employee_id character varying(50),
    employee_name character varying(200),
    leave_type character varying(100),
    from_date date,
    to_date date,
    total_days integer,
    reporting_manager character varying(200),
    handover_to character varying(200),
    emergency_contact character varying(20),
    reason text,
    status character varying(50),
    request_type character varying(30),
    approved_by character varying(200),
    approved_at timestamp without time zone,
    rejected_by character varying(200),
    rejected_at timestamp without time zone,
    permission_date date,
    from_time time without time zone,
    to_time time without time zone,
    cancelled_by character varying(200),
    cancelled_at timestamp without time zone,
    cancellation_reason text
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leave_requests_id_seq OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: meeting_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meeting_rooms (
    id integer NOT NULL,
    room_name character varying(100) NOT NULL,
    location character varying(100),
    floor character varying(50),
    capacity integer,
    room_type character varying(50),
    projector boolean,
    tv boolean,
    whiteboard boolean,
    video_conference boolean,
    status character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.meeting_rooms OWNER TO postgres;

--
-- Name: meeting_rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meeting_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.meeting_rooms_id_seq OWNER TO postgres;

--
-- Name: meeting_rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meeting_rooms_id_seq OWNED BY public.meeting_rooms.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    resource character varying(50),
    action character varying(50)
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    team_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: room_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_bookings (
    id integer NOT NULL,
    booking_id character varying(50) NOT NULL,
    room_id integer NOT NULL,
    meeting_title character varying(200) NOT NULL,
    organizer_id integer,
    organizer_name character varying(100),
    department character varying(100),
    meeting_date date,
    start_time time without time zone,
    end_time time without time zone,
    attendees_count integer,
    remarks text,
    status character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.room_bookings OWNER TO postgres;

--
-- Name: room_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.room_bookings_id_seq OWNER TO postgres;

--
-- Name: room_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_bookings_id_seq OWNED BY public.room_bookings.id;


--
-- Name: shift_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    employee_name character varying(200) NOT NULL,
    current_shift character varying(100) NOT NULL,
    requested_shift character varying(100) NOT NULL,
    reason text NOT NULL,
    reporting_manager character varying(200) NOT NULL,
    status character varying(30),
    manager_comment text,
    created_at timestamp without time zone,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    request_type character varying(50),
    approved_by character varying(200),
    rejected_by character varying(200),
    from_date date,
    to_date date,
    shift_date date NOT NULL
);


ALTER TABLE public.shift_requests OWNER TO postgres;

--
-- Name: shift_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_requests_id_seq OWNER TO postgres;

--
-- Name: shift_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_requests_id_seq OWNED BY public.shift_requests.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teams_id_seq OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: telecom_directory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telecom_directory (
    id integer NOT NULL,
    department_name character varying(100) NOT NULL,
    team_name character varying(100) NOT NULL,
    employee_name character varying(150) NOT NULL,
    designation character varying(150),
    extension_number character varying(20) NOT NULL,
    status character varying(20),
    created_at timestamp without time zone,
    location character varying(100)
);


ALTER TABLE public.telecom_directory OWNER TO postgres;

--
-- Name: telecom_directory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telecom_directory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.telecom_directory_id_seq OWNER TO postgres;

--
-- Name: telecom_directory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telecom_directory_id_seq OWNED BY public.telecom_directory.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(300) NOT NULL,
    company_email character varying(300) NOT NULL,
    password_hash character varying(500) NOT NULL,
    role_id integer NOT NULL,
    team_id integer,
    access_level character varying(50),
    status character varying(20),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    last_login timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: appraisal_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_answers ALTER COLUMN id SET DEFAULT nextval('public.appraisal_answers_id_seq'::regclass);


--
-- Name: appraisal_cycles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_cycles ALTER COLUMN id SET DEFAULT nextval('public.appraisal_cycles_id_seq'::regclass);


--
-- Name: appraisal_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_questions ALTER COLUMN id SET DEFAULT nextval('public.appraisal_questions_id_seq'::regclass);


--
-- Name: appraisal_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_requests ALTER COLUMN id SET DEFAULT nextval('public.appraisal_requests_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: birthday_wishes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birthday_wishes ALTER COLUMN id SET DEFAULT nextval('public.birthday_wishes_id_seq'::regclass);


--
-- Name: communications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications ALTER COLUMN id SET DEFAULT nextval('public.communications_id_seq'::regclass);


--
-- Name: employee_leave_balances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_balances ALTER COLUMN id SET DEFAULT nextval('public.employee_leave_balances_id_seq'::regclass);


--
-- Name: employee_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_notifications ALTER COLUMN id SET DEFAULT nextval('public.employee_notifications_id_seq'::regclass);


--
-- Name: employee_performance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_performance ALTER COLUMN id SET DEFAULT nextval('public.employee_performance_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: holiday_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_overrides ALTER COLUMN id SET DEFAULT nextval('public.holiday_overrides_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: leave_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.leave_audit_logs_id_seq'::regclass);


--
-- Name: leave_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_ledger ALTER COLUMN id SET DEFAULT nextval('public.leave_ledger_id_seq'::regclass);


--
-- Name: leave_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_policies ALTER COLUMN id SET DEFAULT nextval('public.leave_policies_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: meeting_rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms ALTER COLUMN id SET DEFAULT nextval('public.meeting_rooms_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: room_bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_bookings ALTER COLUMN id SET DEFAULT nextval('public.room_bookings_id_seq'::regclass);


--
-- Name: shift_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_requests ALTER COLUMN id SET DEFAULT nextval('public.shift_requests_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: telecom_directory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telecom_directory ALTER COLUMN id SET DEFAULT nextval('public.telecom_directory_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
cd59703cad5f
\.


--
-- Data for Name: appraisal_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appraisal_answers (id, request_id, question_id, answer, created_at) FROM stdin;
\.


--
-- Data for Name: appraisal_cycles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appraisal_cycles (id, title, appraisal_year, start_date, end_date, status, created_at) FROM stdin;
\.


--
-- Data for Name: appraisal_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appraisal_questions (id, appraisal_year, role_name, question, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: appraisal_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appraisal_requests (id, cycle_id, employee_id, employee_name, role, reporting_manager, status, rating, score, manager_comment, submitted_at, reviewed_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, user_id, check_in, check_out, lunch_break, lunch_start, lunch_end, lunch_minutes, tea_break, tea_start, tea_end, tea_minutes, total_break_minutes, total_gap_minutes, total_hours, attendance_date, status, shift_timing, manager_status) FROM stdin;
6	12	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
7	19	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
8	24	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
9	33	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
10	35	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
11	37	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
12	38	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
13	40	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
14	36	2026-07-21 09:00:00	2026-07-21 18:00:00	f	\N	\N	0	f	\N	\N	0	0	0	9	2026-07-21	Present	General Shift	Approved
\.


--
-- Data for Name: birthday_wishes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.birthday_wishes (id, sender_id, receiver_id, message, created_at, status, thanked, thanked_at) FROM stdin;
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.communications (id, employee_id, receiver_id, employee_name, message_type, title, target_role, message, created_by, created_at, likes) FROM stdin;
\.


--
-- Data for Name: employee_leave_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_leave_balances (id, employee_id, leave_type, available) FROM stdin;
126	42	Sick Leave	1
127	42	Casual Leave	6
128	42	Privilege Leave	27
1	1	Sick Leave	1
2	1	Casual Leave	6
3	1	Privilege Leave	27
6	2	Sick Leave	1
7	2	Casual Leave	6
8	2	Privilege Leave	27
9	3	Sick Leave	0
10	3	Casual Leave	0
11	3	Privilege Leave	0
12	4	Sick Leave	1
13	4	Casual Leave	6
14	4	Privilege Leave	27
15	5	Sick Leave	1
16	5	Casual Leave	6
17	5	Privilege Leave	27
18	6	Sick Leave	1
19	6	Casual Leave	6
20	6	Privilege Leave	27
21	7	Sick Leave	1
22	7	Casual Leave	6
23	7	Privilege Leave	27
24	8	Sick Leave	1
25	8	Casual Leave	6
26	8	Privilege Leave	27
27	9	Sick Leave	1
28	9	Casual Leave	6
29	9	Privilege Leave	27
30	10	Sick Leave	1
31	10	Casual Leave	6
32	10	Privilege Leave	27
33	11	Sick Leave	1
34	11	Casual Leave	6
35	11	Privilege Leave	27
36	12	Sick Leave	1
37	12	Casual Leave	6
38	12	Privilege Leave	27
39	13	Sick Leave	1
40	13	Casual Leave	6
41	13	Privilege Leave	27
42	14	Sick Leave	1
43	14	Casual Leave	6
44	14	Privilege Leave	27
45	15	Sick Leave	1
46	15	Casual Leave	6
47	15	Privilege Leave	27
48	16	Sick Leave	1
49	16	Casual Leave	6
50	16	Privilege Leave	27
51	17	Sick Leave	1
52	17	Casual Leave	6
53	17	Privilege Leave	27
54	18	Sick Leave	1
55	18	Casual Leave	6
56	18	Privilege Leave	27
57	19	Sick Leave	1
58	19	Casual Leave	6
59	19	Privilege Leave	27
60	20	Sick Leave	1
61	20	Casual Leave	6
62	20	Privilege Leave	27
63	21	Sick Leave	1
64	21	Casual Leave	6
65	21	Privilege Leave	27
66	22	Sick Leave	1
67	22	Casual Leave	6
68	22	Privilege Leave	27
69	23	Sick Leave	1
70	23	Casual Leave	6
71	23	Privilege Leave	27
72	24	Sick Leave	1
73	24	Casual Leave	6
74	24	Privilege Leave	27
75	25	Sick Leave	1
76	25	Casual Leave	6
77	25	Privilege Leave	27
78	26	Sick Leave	1
79	26	Casual Leave	6
80	26	Privilege Leave	27
81	27	Sick Leave	1
82	27	Casual Leave	6
83	27	Privilege Leave	27
84	28	Sick Leave	1
85	28	Casual Leave	6
86	28	Privilege Leave	27
87	29	Sick Leave	1
88	29	Casual Leave	6
89	29	Privilege Leave	27
90	30	Sick Leave	1
91	30	Casual Leave	6
92	30	Privilege Leave	27
93	31	Sick Leave	1
94	31	Casual Leave	6
95	31	Privilege Leave	27
96	32	Sick Leave	1
97	32	Casual Leave	6
98	32	Privilege Leave	27
99	33	Sick Leave	1
100	33	Casual Leave	6
101	33	Privilege Leave	27
103	34	Casual Leave	6
104	34	Privilege Leave	27
105	35	Sick Leave	1
106	35	Casual Leave	6
107	35	Privilege Leave	27
108	36	Sick Leave	1
109	36	Casual Leave	6
110	36	Privilege Leave	27
111	37	Sick Leave	1
112	37	Casual Leave	6
113	37	Privilege Leave	27
114	38	Sick Leave	1
115	38	Casual Leave	6
116	38	Privilege Leave	27
117	39	Sick Leave	1
118	39	Casual Leave	6
119	39	Privilege Leave	27
120	40	Sick Leave	1
121	40	Casual Leave	6
122	40	Privilege Leave	27
123	41	Sick Leave	1
124	41	Casual Leave	6
125	41	Privilege Leave	27
129	43	Sick Leave	1
130	43	Casual Leave	6
131	43	Privilege Leave	27
132	44	Sick Leave	1
133	44	Casual Leave	6
134	44	Privilege Leave	27
135	45	Sick Leave	1
136	45	Casual Leave	6
137	45	Privilege Leave	27
138	46	Sick Leave	1
139	46	Casual Leave	6
140	46	Privilege Leave	27
141	47	Sick Leave	1
142	47	Casual Leave	6
143	47	Privilege Leave	27
144	48	Sick Leave	1
145	48	Casual Leave	6
146	48	Privilege Leave	27
147	49	Sick Leave	1
148	49	Casual Leave	6
149	49	Privilege Leave	27
150	50	Sick Leave	1
151	50	Casual Leave	6
152	50	Privilege Leave	27
153	51	Sick Leave	1
154	51	Casual Leave	6
155	51	Privilege Leave	27
156	52	Sick Leave	1
157	52	Casual Leave	6
158	52	Privilege Leave	27
159	53	Sick Leave	1
160	53	Casual Leave	6
161	53	Privilege Leave	27
102	34	Sick Leave	0
\.


--
-- Data for Name: employee_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_notifications (id, receiver_name, title, message, is_read, created_at, related_id, related_type, notification_type, status, action_required, resolved, resolved_at) FROM stdin;
170	Muthukumar S	⏰ Missed Check In	Employee 1216 - Murali B logged into the system but has not checked in within the allowed time.	f	2026-07-22 09:23:59.826032	6	missed_checkin	missed_checkin	Pending	t	f	\N
171	Murali B	⏰ Missed Check In	Employee 2041 - Sangeetha A logged into the system but has not checked in within the allowed time.	f	2026-07-22 09:37:59.83105	22	missed_checkin	missed_checkin	Pending	t	f	\N
172	Muthukumar S	⏰ Missed Check In	Employee 1718 - Madhu Malini N S logged into the system but has not checked in within the allowed time.	f	2026-07-22 09:37:59.837716	9	missed_checkin	missed_checkin	Pending	t	f	\N
173	Srinaath Kris	⏰ Missed Check In	Employee 1683 - Muthukumar S logged into the system but has not checked in within the allowed time.	f	2026-07-22 09:38:59.830748	3	missed_checkin	missed_checkin	Pending	t	f	\N
174	Murali B	⏰ Missed Check In	Employee 2149 - Hemamalini K logged into the system but has not checked in within the allowed time.	f	2026-07-22 09:38:59.837395	34	missed_checkin	missed_checkin	Pending	t	f	\N
\.


--
-- Data for Name: employee_performance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_performance (id, name, department, designation, review_period, efficiency, quality, productivity, attendance, rating, goals, feedback, reviewer, review_date, created_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, user_id, profile_image, employee_id, first_name, last_name, email, phone, alternate_phone, dob, gender, marital_status, blood_group, address, city, state, country, pincode, department, designation, joining_date, reporting_manager, salary, sick_leave, casual_leave, privilege_leave, last_leave_reset_month, last_leave_reset_year, bank_name, account_number, ifsc_code, pan_number, aadhaar_number, qualification, college, passing_year, percentage, tenth_school, tenth_percentage, twelfth_school, twelfth_percentage, ug_degree, ug_college, ug_percentage, pg_degree, pg_college, pg_percentage, pf_number, uan_number, esi_number, tenth_board, twelfth_board, ug_university, pg_university, total_experience, previous_company, current_ctc, expected_ctc, notice_period, skills, employee_type, work_location, shift_timing, probation_end_date, resume_file, aadhaar_file, pan_file, degree_certificate, emergency_contact_name, emergency_contact_number, emergency_contact_relation, status, profile_completed, is_first_login, team_id, salary_paid, salary_paid_date) FROM stdin;
2	4	\\x89504e470d0a1a0a0000000d4948445200000407000001490806000000e7ae44f9000000097048597300002e2300002e230178a53f760000001974455874536f6674776172650041646f626520496d616765526561647971c9653c00006b404944415478daecbd4f6e1b49b7b719f5a2806e5c7c80f47ad20d7419620d3cba03b15620d60aa49a7f05d12b306b011f4ce35b80e90db429bc0b286a054eada0a8c11d7950145c83ee89af04342eba47d579e493769a2699119111999199cf032424cb64fe898c3fe7fce2c489effefefb6f030000108a1f7e7d3bca7fc8719c1f63fdf3a4f411f9db518d4b3ce4c7baf4ef8d1e4256fcedaf7f3ddff03600000000ecf80e7100f618f76335ec273b0cfb334f03be30dae56ff7b9e19e51d2009def2746eaec17bf9f26769b772a1caccb3f110e00000000100760b7813f2919f84d1af785e19ea9d19ee546fb3d6f0520b97ea210018abee2ace38f548897eb52df83600000000088033038235f0cfc0bfd7994d82ddea95820c70ab1a0ff7c7cfa4ceae4a3f3f9e4c3fb052592543f511c270378ec07f3b550995113000000007100fa68e88b183035e985fd56719b1f4b150a36bccdce0b01c57295f22c7459a0ba7af2e1fd94926aa59f186b1f31e9603f11532cc8e87f000000007100ba6eec1782c0794f1e4984828521a2a08b624011a9623303fd1b11048df611c57144891c44a29a56f9b1ccfb9f35c501000000880390bab17fac82c0ccf43714f8418df439b379490a0223532f52e5d5930fefe79464b43ea28810982208d4160a16f441000000803800298a02333d8664f05f211224230a4ce45d98fac9ea1007e2f40f8520c09281b0dc984fd1044b8a020000001007a06dc37faa4ed9c9808b41448219cb0d5a1306a40ebe0d743ac481707dc348fb86b6970ddce8cfc7ad4c77fc5ec564c7efa9ed9820d10422102ce887000000007100da30fc97118de462bbafec80312f21cac725a35d7e6f6b66f239b377ad0803e278fe1ef0948803f5fb86890913c5e1caadf97a8bc0754c4759fbc091f93ac965db9153d26fcee88b0000000071009a32fe676afc873684af4d80ecdcea9c14c67a530911dfe4f73ca376342a0c8cb5be84ac878803dd1105440c90b5f7c96cfda73915a41c2e4cbbd1053f91b810000000bac2f71441278d7f99995f0676b865a64bb2c32f43addd5747418e85de7391a02ea6b13ea686745e1880f445816b150492dc35441df2f556df23a261d3114d63bd0f00000000c40108ee008cd5280f955be05114c88de97964635d1c88a51ca535d09788039d16068eb52e220cb4db278c4cdca54505377a9d4e6d23bad5f78c5524b86ce8f2f447000000d0195856d02d276012d8197b633e65f9bf6fe979a23835f9f37c476d694418c84cbc9958961554b71f790752462f225ee6c17c49b0b7e951d98d4c3c81b2cc4d5e6e136a2b000000200e404863766ac2658217837f9a1badab449eed421d9050a207eb7ce38b03cbc88e15e240757fb030f1a236eecc976546f73d2ec7913e67b49c288895000000803800a90a03923cec22b559409d05cd4c9899e89f53498cd65361409cf697912f8338b0df995d9ab8bb930c2ecb7e0481b20c622500000074827f5004c91bade3c0c2c024c5f060999dcc0f79d6ab00a7639d6f3c6160da803000bbfb02592bbf8e240c8828f02a3f4643dc7e4fa3a846e653a2c5d08ca8bd000000d005484898be3090051606920e11ceef6f9a3fb7fc5a2764fd98da13451890fab8a0241aef078ac48fb1a205c4219ef529a78067df237de3858a30af039eba48220b0000009034440ea4ed102c4d9830d74e08036581c08489208070c2003b13b4d30f4cf21f1b132f5ae097bcbd5d0c5d18d8ea7f4400fb59cb27943800000000803800de88811a62fd7d917cb05349c55420b8f5fcfa84ea139c90db67829d3030cf7fbc33710419891618a5929434c1fe27d37e24844030a244010000a00bb0ac204da740926385ca043fef70322c31ce3786d9ea56f9f8f499085567944463edbf881a8a9541ff379d1d87c302c15a2337b29a7dd029a5090000005d80c881741d8310dc74d90928d600532b5a1506a6f98f17944463ed7fa4ce680c614066c17f42187013084c8008027daf000000008803e0c4dc849b299ff6c0381747e98de3d798e50e230c9080b0596140ca5b9cd11833cdb24467cc967ade02c1ace66910070000000071009c9c03312043cdd25ef528c9d8dc844b0e0676c240c8849860270c6491ca3bd92d4c3b2410485b788538000000008803d0a4139ce2b9da36cceffbf43c1d419c219b19ec3be31ed9015f0b03171185011109c75d4b489a683f247dd00de200000000200e406c07418cc75049086ffa364ba8eba4efa829f1f9f8f4998450dbae799fe6078ea77fbb97f2fb3da23030a5948322e5e913c5843800000000880360cd2ce0b9963d2da3b983d335a14a79090312defedaf2e3af9e7c789f516adec280d4d1b7914e8f301001155de71e5f451c00000000c401b026a421dfd7bdcbe5b9c83d104f183876a83b374f3ebc9f536adec2c038623b951c03334a399a40b0d032461c00000000c40108ee288830102aacf8a6afeb8bf5b996d4986848d99e587c4e049a29c5554b18c84cdce4832cf5888babf872429101000000e200d87011f05cd9001c5808ccc7a7cfe6c621cfc0930fef37949a9730504467c410061e451b8481f8e816ab379404000000200e40682601cfd5eb7dcc75cff15baa4c50614066b25f5a7efccd930fef57949ab730204e65ac59e4a9b60f6886b9e3fb9f5064000000803800550663c859c42138074b8bcf8ca95d56c2804b9e813bc396927590b5eaa791cefdeaaf7f3d47b46910a2070000000071004233096cb06e06506699c5678ea95a562c8dfd4cf6c5930fef0959f7e0875fdfca1af5cb48a7bfcddbfd9c526e8585c367e9930000000071009a13078680864edf5112f5f8f8f49938acb6790664db4242d6fd840197ed215d913c031794726b7dd1caa12f229a090000001007e0206701cf35a4105742a8eb09032e0e2bdb16fa0b03c791ebea7c20d14229b3a408000000007100ea3a0e234ac19b8c22f016065c1c56b62dace9bc9b78090865dbd205458c38000000008038d07d10071007da60e1e0b0ced8b6d00f4d36fa22e225669472fb68e486cd0e2a2c2b00000000c40168cc581c0dc820bf376c69e8ccc7a7cfa6c63e31def5930fef97949a973020d11931cbee0ddb162685cdbb262121000000200e4063c6e2c9c0ca0fe7c84d181819fbecea2c27a8c73c627b7c306c29991a19450000000088030088035d41f20c1c597e76cab6857e682e9198cb09161a390389c00e2a000000803800759944704c26032abfecc0ff8da85e5ff8f8f4d93cff716af9f1374f3ebc6737087f9611cf2d51032421ec5e7f040000008038008d3398a457156bae1107be080393fcc74bcb8fcbece79c52f343c5b9b38897206aa0bbe2007d1200000024cdf71441ef10e76448338b6fcc6e41842507e6f3b6854b87afb09ca01ecb88e7266aa0dbe2c00945040000008803d0b4383018fefad773b673ab76566d9d12594e9051647efcf0ebdb69640790a881b4fba24d5e07ee1001000000a0abb0aca07f1ce506ea05c5001f9f3e937a706ef971d916724ea9d52276f92d29e2e421620900000010072029a614c1e085819161394163341035702d33d39474f2641401000000200e800fb18cfd73dd4e0d868b0803b6db16be7af2e13d339ef59835f03e217d76b523c915712ded8ce2010000809421e7403fc501616e88201824ba6da16dc6fcdb271fdecf29357f748782d38897b8fbeb5fcfd95ab203e4ef29cbebc38df6ed991c447c00000000e200d810338cfb3237529762ac52cc83120664e786970e5f99526ab5891d358030d02d816042290000004017615941bbc40ee566dbb3e1b174f82ccb096aa2cb77ce137aa700000000005e200eb4cb26f2f94f73e7654e310f838f4f9f8918641bdece7282304c239f5f961420e00000000000e2409fd1b5a80f912ff352d74443bf850179c72f12726a1107c2c0920200000000401c18085903d758fdf0ebdb3145dd5b61e0d8b09ca071b44d9d44becc92920600000000c401c481501ca940704c71f792b98393ca728270c44e44f8c0920200000000401c401c088d388f190241bff8f8f4d9856139415b5cf4a46f0000000000401c681b9d19bc6be872a70804bd12065c9713bc613941187449c111e20000000000200e40489a4c3a2602c1861c04bd60e9e0a08a0035a7c882316de01a8803000000008038304027af49c4a19408820b8abe9be87282731767f6c987f7f7945c3062b71df20d0000000000e2c0d05027e0b60581e0f71f7e7d3be70d744e18f0594e90517261c8dbccc8c4dfa500610000000000100706caa2a5ebbecc9d1df210740b1106584ed01e9306ae9151cc0000000080383040fefad77371f81e5abafc99f9948780650689e3b19c60c67202c4010000000000c4816eb168f1dac53283055104c90a03aecb09ae9f7c78bfa2e43a290e6c286600000000401c18b638f0d0f23dbcc88ff50fbfbe9df03a92438401dbe504528fa61459581aca3720914488030000000080383054728740c2bfe709dc8a383fef7247684514411ab09c20199ad802f486620600000000c4010402891eb84be476c419955c0433de4cabc280eb72829b271fde2f29b9ce8a031b8a19000000001007409826742f12c6fefa875fdfb2d4a03d9686e504a9d0441b401c0000000000c401788c1ec8f21f5789ddd6a9f9b4d460a9ebaea1013c96132c9e7c788f73198f262207d614330000000034cdf71441b24828bf38864789ddd7a51c3ffcfaf69538a29a2701e20803aecb096e9f7c783fa7e4e2a0f9379a688fb42948b1fe8f745cbacffb7dfa1980feb67511c1e518958e4364fa5384ed4dde3f207003200e4068c4e9ce3b681107de257a8b2fc550947c04f9bd2e79635158383aa3e48688cbb8a1eb6c286a48c851986adf725afa1bc23040bfc400b13727f971e6718ab3adf3c98f1b150d328d860500c401082010643a43ff32d15b14c7f5ad262c9c310084e3e3d36732485f3a7ce5cd930fef29ffb88c1a6af78803908ad320d132bb444a71249609dff7d4a49b7b454495f2ccea468ffbb6675cf3726b7d0cc9cb6092481d927a3f6ef93666b1ea44291248da728ced79cff478995f4b7221ada4cff0b11355bc5850373bd1bff5b2cc110720b58631d744806709df66918f4094e229ce4d6d61c07539810cbc734aae1fe2004042ec5bda364d591cd0b69af29879bec7e8971f772a1e881395352c189c51e53f334ea03c826f25ada280d80b970d3ec791f9b22455eaf7dc31e2f498bad9a9fe2d647d9d30f1d83c2424ec8e8176db81fb94ceea4f51dc75c609fc9081db45c99f3ef9f09e10df668cc5d8dc52cc9010fb962a9d9198361a272a1ebcce8f3ff272bed744c017140dd470b28ea51e898dd6b030b0ab7e4bc4e9462302000ec138833800bbd0b59d53f36986b80bbcc80fe9f8e7bc3d377439c10b87afdc3cf9f07e45c93542138217220fa4e24c8851767ae023293bab1bf369cdf35d0f5e4531ebfabb3a54f388e2bb94595b02e5ad5e3f15d62ddecf9d5efb3e505bbed036e1220a5ce7872c6bfd79cff14a3fe36b978a48606b23deb75c376f12ab9b45ffd6159f0071a0637cf7f7df7f530add31d64465cd4c7a3b18540d72b26e0e07d64e1c585718e465646018b7bd75617ecf32c087ce8bf12ab59d17c4303771d6667e6584b0c60e12a9efb2c6f790507997d7d551879e47c64f71aae5e7ac81b61c93c7a56479f92f229759515ef29ea7264c28f395da31d29faebb94d85297784a995c9830bb498983b7325fb2fc6f5a68c7dbf54a3eef947054cb656adc23126ef3eb8c3d9f6b64beeca440ddfcd2bf5d68791cd5a893598d5b29eea3ecdcd7e96baff3f740d414e200f45020283a9c195bdc0475b29370a007240e34d159220e402af5fdde629cf9a9ab7dba26dfabeb50dc168e84f936d160d9502e1cecd3d0fd856930cf8f261f7e5de314cffbb2bb51005bec2a2f8b69e47b5c3a38ec6fcc27c1e9bec6f5462a2e9cdb7e27bfde77d4cde0effd58fb221fa7fc558cad6ab56e489b9918b72498d8448803d07381e07140549180f0e9af1d6ce938ff74f8ca5dee3c8f3a2a6a200e1c30d0f2b6c19694d0765d17e3edf7141c9c88cfe8dae7164828f5c233eb7a79d6f93cd0a3c86cef455349bb6a4450f5cec8779c95dfe69f31ed20076140eacf346474a766d37fdb7439d4a89bbd9b9d767c07d1c5811df7277d815ca752a00d2520813de41ce8203a533331dd5c6f248315f908be65e9f8f92945d6b823d10488669002b6fd4b670d6a9d6df7c949b0f675c4c50992d94975447e349fd66dd71dc76592e09d3a034db06af87b29e3fb4c379185818583303009bdec5367e07fb2acdb63ea665275b3a9fe3753b1f037865bc4014020288c99979a5c69f06b893e3e7d26469d4b78ebf5930fef335a41a38c280218022a84d9ce6a1f75bc0f6f6d498488133a4327e57d1de0946f75362ed532ebdd92c21ad11a59c4f62bedd1369a611a6b59909eb7e9be61d3f0f752ae9b223edd76e03e17550201bb5a200e807be73b32ddddfe4cc2bf24037336d46db13e3e7d2661a62e49a5440c22ec1c0062e16ad04f1107ea19f11a49f03cc0e9560d8ca5be8e14515191d1652b4bcb8fbf899d285ac593aa99e15102edb9afb9b03ad1e6542038b41b045ba3230e80ab61613e45105c75f83164d6fc4f09858bb84553aac840ee923b62def6ee0400d06b5cc5c7f301f6db31c672190b6c43b1f77164dc97a835f57c7d75c07c2667b248f7b2b0b4276439cd3c11c76f9440ddecab70d5a5e79a1b401c80b01d9b26857a6ebabdefa984c2ad87b2d4e0e3d36713e396944a92102ea8f10010030d4bf749e8c55653e11ce849cdd39cc51c439b4a7c8803e6dc76c5c9b6dd9960deb0434cb4633b744690d37e659fd036e255220e807fe35aaa6171dbe1c728961aac06b0d460e9f8f929b5bc35189c6008f8f6315d35fe9373745520a89ba40b117978cc2d3f271348ab16eaf45503d7c9a806bdb489b1bf1007a06e279c1f92bce355c71f4566d4d7ba776defd0edff5c66e84842883800100d5d1a70e9f9f5d3a1e68d89348e578562577142b2dfc1b55ddbf7bd6a298c3e55c7ef8e1a940c2b8a007100e21a17e27cfe58d3c0681b593bf75a1316f6664debc7a7cf64307ce9f015921002406cea3a93538a302853de0738b45ddbdc45594b36a95cf73641716043f549c66f91778158833800b11b9aee23fa4bc71b9c242cecd3b6874bc7cf2f4842080091a92b40e28c863794eb846293287258e2802d6dae435ff2aaa0828c22401c80668c0c09231b996e272c1455fcf7aeef68f0f1e93319c4cf1cbe224908e7d4e2c130a208a069741fe9d39aa739d18486108eba7d3fef631858bfe796778d206c1c1007100720319160a9cec7ab0e8b04b2a341d6c5f5ad1f9f3e73d983b8604acd451c00884ca8654bf45761c7ec8da99760784c29f61bb5858e3a549f091b8743ac2902c40168be73bed77c0432a05c75f43164866bddc159aab9e3207e4312420088ec5cec4b66e693af862478e159d6f8ee84e2eb3da38edd2f360d1cf25110071007a06591606a3e252dbceee0238893fd2e376ca75db8d98f4f9fc90cce0bc7af4da9a9c9b0a108a0a7ec4b6626d104aeb3d6475de99307e24ca5e238def01aa331411c809e71439d411c80764502495a28c6e1cf1d1dc0df4a1e820edca7eb3dbe2109e120c501128841d3ec72e6ef740667e9713ea207c28ed1f21e7c97019e50829018cc0c03750471003a6280641dded9e0c50fbfbe5da67a731f9f3e13e3db2509a11882736ae52039a508a02974bdf2aebea910337dfa55b2e4632c43ba6dbed53c14848d83657f277e8844354b8eb40d45823800ed76dc5dddd9e0324581409310ba460dcc9f7c787f4f6d0480c8ec4b44b8d2f1e0def82d3b9b52b46988036d3b83901c9304ee41f25ddde8815800db7ec852fc10896a961c699ac81210072085c669bab7b3418a02c1dcb8252194ad0b17d4c0e1c2ac2b34c82e27fe7acb185b053a2ff853472ca63f81a4c401c9772591aa7acc7825008803d01d81a0bcb3415744021108e629dcc8c7a7cfa4dc48428871ee0a337d101d4d1cb84bb85cedf8b76bdf7fdac5ed66136643114020ce699b008038004313095e2692317be9f879b62e4cb70d10fa087d6357e2c0078d1afbaaff377ed103cc08a6210eb0440db699530400803800431309deb6b9d6f2e3d36762789f397e0d631a8409450031d199c3f31dffb54f04f01107d8b5208d711b61b3dff8bcdf4b72510000e2000c512458b5b87edb356fc0d5930fef31e2d2a6a97ace1a6188cdd4a5df9244b5c67d179b93bcff452018469f05edb1f1fcde92a20300c401882d12a4c6491b03e0c7a7cfe6c66d7f69b62eec064d8937cce8401be2c05dc52c33d103f459909e1de6fb8e4f53de021a001007a01f22c18fc66fdbab989c37397ba549085d97072c9e7c78bfa1268132a2082016da1fee122fab1c051f47e282dd3782e02b18220e0c035fbbeb12810000100720a648b0917d49f35f7f31ee21a831593668a0ce8ddbd6851235c0d685dd206be83a27143544e4c2c7f9d719ca5bc76b1d19a20742e03b7e65141d6313020100200e40db2281849fca4cc79b446ee9a80907fce3d3671319681dbf265103649386af20591444aa57c77bfaa81b11772d4ee1e344200ed467e4f19d071d8ba1ffd47dcf8f0201513e00803800310502596a20e1f53f9b34a2082e1bd8db77eef8f9bb271fdecfa92d9d216bf05a88031083694da7dfc709615ff576c4018481e1d85b1b537f49a78886196d159a4084a8fc98940eea1de2000c68d0cad4d1b94ae07696b14eecb97521c240b7d824ee0c0054b12b1fca83ad23a94ec88dc775891ea8c799c777185f864588e8c8d3fc58e78eda94e28406c6a277a5833a873800031308248a401afe73d3eed64a6711d549d78159a20696d48e4ed5e326c58109250e2191d919b33b9fc54afa688753f9f45b187efeefcd278ae8aae1fe0ada1f9f32e327dc6d23cb30dfe6f56ec532038808750b7100e071f05aaad373dbe26dcc439ff0e3d36733e39e446e4e8de8244dd55d96154068a6819c7d9f70f553f26878e31375c1f8324c42bef7f3fcd8104500d838880300b10582b50a04372dddc2654835fce3d367c71e03f22d51039da5a9adc18e588307a1d03e6f979379a7338e2e7db84419f82c13c3c9f0c3b5dc5e11353058fb2a3361977016510419e21e0486c801c40180af8dcbfc9898f6f21084345267c66debc2e23b803850c584e286405cece9a7969ee7f3891e401c70e4c052907ddce663eb9c921b34625f845ebe29392ffec8ebe382a5061088538a007100609748306d49200862a47e7cfa6c94ff78e9f8b59b271fde67bc7dc401c40168d86130a1c401dd22cfd5019168181213c61babe47d50bed855f711ebc10bc35203a8095128880300290a04a78142b6e70d7d07d2a9af19e20074d010db354b735333fcdc4758c079b57f6fd2fe2f5dca96e504501aa75e453a7db1d460ad7514c015c481c4f99e22801404827c90318e86505dc448f5defa47a3067cee779e7fb76faf7014e19cd3bc9c9a343c164f3ebcb70d95be35cd84c49d888885c10f35091a35b0f5fd178edf919c2f33c7dd1186cadce1b3cf1b162e217dbb6aae9320b1ec2a1903dfe5d790c91dda3438d9771401e200408a02412d71a0c677cf78db768eb171df01a20eb28ed2561cc84c73ebe526019c381836bb66eb1f8c5fde80729f2d3387771eedf4823a7d98bc5ce70e63c573dd090860975d358a6c7788cd76217536bfde8252878abe6d861d9c3e2c2b8094904ea3a9ade2bc3b279dd13ee775f58a53874885acc1fb9af06aa086213635bb1311ae02cdf4f938a553deccc17726e2896d2e1b8401a842ea53eca59bd2c7bc66a9011ce8d7c6f92182f46b4a237d881c806410635507968d71df01c0a7b39a788662ce795bbd6466e9f837290eb0461bea300de8d4ef3b8f6b52d63396cbec37a02ddf8d447e4c746b6080837695f4030d4566164b0dde889dc452834e32d1c8a520e7d29fe3266c7a401c807e0b04e210bd6be0726357474f67970989ea1f8fc68c431dbd69a81e1cd510b160d88ee6684f1dbd0b559fc4c1cfafe39383a3eeb2ae3ebeafa9964995112d7dcf058e1738b6551108444c6a62e6f6850a1253ddd904bac319362eb0ac00521cc43275d69a10075c99f3867a8518da3f3ef9f07e961f2ec67693060fd103e0c3aca1babb08786f431506a40cdf5a0803aff2f1718230009eb695d4b39ff2e3ae81cb495dfe5d42c9f3e398d207401c80c386c0b1cc8e8b41a06bb47038773be1b107b091cb87891ae81552b77e79f2e1fd243f361edfcf100720712e023af387f0111b4ed8ebfa537e81fc90fea76ad70789cef84932d053ada1a64020d103d2f6de347449c9cf442e02800ec1b28286c400f369ed4d716c8760320bf0ed0076af594d7f8f781957471fc3acfbc85a5dd9b6705eb37efa666af7e1d191627d71e7c70171cae51dae63bf4b5d9ab5ab6ede865eebaf7df5b5714fd22afdfb74a0f6c0853e7fd5720ce9af66241d84d06d56ea95f6494b137fd243fa22c945f01b3b1a248fd83521c68863d3dcae4e8038d049c4083894b4694411ed1cc0560daeed3ec8c7a7cfa4a31bf3563acde37ecc8ecb070e2133a62f1abaf7a92114bbcb0ee1b85c57f27f3fa85090c91121a7c43ea73b9661bef410072e06f6fec7facc1353bd7ce041dfd582250410d1c6122770a2b3fa4b135fec7ead42f794d24f9665e80825ad5f63b5614e2862c401b04366068f310276229d54b4e484b6c9dec4a1d465059921eb6ad71081699ebfc3d00ed81271002cd97e77d28714899f4438fe2e609f363ae0a847c995a142ee8363df28c9362f3a98b06cea1022ed3b7b76cf120268502490b171a4d19af3c836cea5f65124d51c56fdcaf2f72e3693889e97944ada9073201d9895dedfa9dca4702fb97329337d62143ef0663a81bca7e79a57208b5037a53edc36f42c471a2a0edda4c97737ddf3f7abc8c6f82ae0bda68ccc7c9d591ebe61b527ba7b014093f696386ee2b85f45bed4993a8b242a1c56fd7a5cce629a498809352072201dc4e9cc28869d2c4d22890045202082a013bc329f720bdc3750375f37f44c53d3ec2e09100075f20ef5153711eac95ee75d43dc0ba37c64be5dd636d9f1dd8dd9bd0eb518b3eeb52db8ce089d1335b797b9962940d30edc54f3112c22da5ea7da274d28f561d52fad5baf290dc401a886c881fd9dc9523b9318ceb8b3728d40903492186de6b90341eae2803852a3d009e5203a8d450d68b8fbbe359db2ad98efa9f739082f03950f4ef0b79ce83ef1940db461773d464a6a9f328f24129c49a83939080607c995110700712008a2305f462a77e7d9d8924040e6dd4f338fa193ccf864cc8d9157a0ca801215fcca34b7866e66c83dd0192ad6ffc73094ba6864cf3a260e48a44776a02f1c158e4f806bcd0dc209b42b1264259140ec9dd019e8250741860836ac3a5543a806c4814171c2ac602be28037a51c0483e6e3d36762c0be0c7cda65dded061ba4c9043b12ee39270cbb33d838eb41dea5aedfed62a2a7d38e8d7d996db2405dc231abf15e881e80944482b12e930a1dc9b9508100fb773834b51534784042c266b0edf02614d57e838c2280448d2611899a4a9a2906198909fb250eac1bbc5697cba9937d83864cff6cfc13d9ce694690509d5e9a4fd1316f028f6b4461e21701e2008d600718fdfb0724995dbba5242051e63dbd167852b1febf4ca8281017075b1cd51b3d5e958ee7eac86e1fbf6c7deeaaf47dc481eaf12babf18cec5c00c9d963f93133f544af6dce1db60805c4018808cb0ad2828ef13032c3167abd1b1d140431fe73c3a6a93039428dbb81ad43573b7240c3d7f7f58dc51a79b9cebd3aaa3eac0e5c5f96348cf518e9b31f39d6e9b146e1f4b58f58e5cf28b3ad2f3cbe3e37e41e8034c7bd91f60da1726c6007230e00e2009490bdcc27358c373a133a28680f316cde36782d9c85447159ff1f287fc4be24950ff9f9a31bdbfa0c991ef2fcf2ef971ecf301d401f211182ae22228220a42a10485b9fe88e522f6a9eeeacef22217c665b6cc6ef4908961534d379ba547a9616ec87ce03526ee762b837957b8050e3b4b17d37b5eb8b0a111796065853f838b11703e823ee8dbf0032a75941c2755bc4bde7014ec56e3cc3a82f928f655e3ab0ef110700712019c8fa0e2169d2805fa86308e9616be06e028d19472989039a75dc3547ccd110042f3582af3dbe8a2008a9d7ed650081001b1800716030dc391800638aabb1c18cf035086df837b97301b32c8991f7df2e61e321c4817d75e04ed6b9b758144b1c03e77756c59c16063d17088e484c08803830145c8cc029c5d5080f140144a0c9f6fb52134241371dbfacce85f4ddef4b44b86ab91c7cae7f3e8468188dac78e5f155a207a02b02c1558d53200e00200e0c0297f07506ff66206a005232fc7d5952ea69a0515f2e59bb37352f394bb55e683bf0099f1fcaf82709dc7c04ea392d0d3a300e4a3bf6dd7e1a710000710047748b2366071007a0d3869118f0770d5dee4c43d9a17d5ca2061ed481aec3be71e22e912553ab80cfd4b73ee2ded3d1277a003e23d1430987e1fbd6d3116f1600716008b81a810cfe8803d06d9a6cc34b9213b66fa41bcbed0b43f43fea2026958830d07d9c0e65a9cc5fff7a2ed1033e22e29cf63ee8bee6223fa4cf17bbf24f9368f4980a945ecb6778cb0088038803df72c65ae2e864140144348ca47ebd69e8724786e5056d336fb8ff991ef8bf65226d4066c77d9616cca83795ce13c948878bbcfbcb92139db233edb57c86c4dc00880343c06796684eb17dc524e0b9ee0284f40254394762c4dd36743949e686c3d0026ac85e3a7e6d5de37a23b33fb7c16d62bbb0f8440f5c0ca88f581abfe88119d10350ea132689d6ef7bcf3e80ba0d8038d07b03e0dee36b97440f2465b002f83035cded8c3167c6a515161edfc96ad6a97d2c13747e5debffc9c0b6339b7b7c87ad4ca14ccafdfe82d703803800bbf1d9ff7c4eb17d26a4b198519cd09073b46ed0887f5c5ec08c62736832c833c7afdd790ac636e2408ac22789090ff7114b43f400a4631fc51803ef784500dde07b8aa051361e46a4440fcc09817f2494322e59c2891c80468d7f9dd17fd1c0e564df7b7136d8c120be30208e59a351032a46ec5b637c9be85821fdadebb20b49ba765c5344e912f3fc78ebf89d23ad7f535aa3777b9a695f99a98db6ea689d4b3d622cf3e803865e37a54f981475534544da6ba9bd5226712072a0597cd7812ee8101e97571c053a1d9d09b42110c8a076d3d0e524ff00a19cf19919bf6460598d6b4ebbd6b7a918ebbab4e0c8907bc006961fd643da934cdabccc8fb71d1106363bfe7692f892b20d55ad5edda4382813c401c4816d437f32f0b20bf9fc384dd016e2ec3495a0f005fba1c7430df1979e5fcf3caf29910ae75d13076adcdbd0a25fe60d962d6df8537b3aede0ad6f1ab093429351e39ceae6c8b0a5635fda2be20044110718fcc31989372cd180b6d0592931e09a4a50f81681209a91e2bb34a9ce4e2987dee575e2b39e3e63d8f99066c56b440f9c3181e045df92b7f6a9af5f5337610bfa38c481de3a06be49594e74fdd1500df1f340a79b53130181006a22d147beb33a75f29dcc229db7897aef9b948ce8013b9634cbdacec64347ee7b9fe37cda17316d40b9466cebe60dcdb5b3ed1571002ac96a7cf7e540b7290b1935905105211147a9498160814010062dc73a89b532cfeb4a7d39e9aa3850e31ea703eb1bc4c9f71151063b8110d0b6e8ca6cf57dcfdbcb2d559359728b3259532488037da16e655e0d70eba25962e781f8f4be8e372c104872372208ea0b03f2beea2641ca3cbf77e8dd5d7764a66de9f19dd3018ae2be4efe8ce484d66db9cbeb97d73d1707d603af9ba31d7573437b25df00e2407fc96a7e5f668e1603ea1026813a8437ea8c41371cf94138032d44102010f8f7455227ebcece7b39f16a181d8a565875a8befbcc0a0eaaced6881e383224dcb5e522827dd654fd38d4879c24dac7bb8ce9d9c0ebe664c7df36b457ea09e240bf9d81ba5cea5e9f43601ee01c0f865c03a90cfab0bb4f1899e64229dfb2cda197309099fadba9fa3af18796563d746cafe765e0e767ecfb1a49e27841abed7d9d3ab4063d457160d4403fd9e7ba89380088033d27446291d77d9f015403e72cc0a9a624b7e91ca3213d6c294961534987649bc36c804b94da14068cf19fe9e86c22c240f77b323487b746f480b0a06d1f6cd3fb921c671d7a8c43cee25982edc57612e17ac8f69a2e2938471cb02a93cc00e2408f0865ccbdedeb5a4c1dbc43cc6eca728215552e2a6711ce39b8fd7dc520ca0f1108ae1a7c6feb8126396d4318b8f5d9c250efe1b42fe28096814f940cd1036efde79c16bc979987c3dd2571c098849697a83d676b270cdd5e9beef9fb9a32e9747b451c804ab290e7eaa9715f67abb0b2314e12c2887c7cfa6c1cf1dc932196695e6765207c6e9ac943206dec0fb29cef3468e53dfc1148181096811d19e1a1a3e2a78fe37299c86cf8a8c1be40ea8c6ff4c00b9617ec7554a77bcabb4bce46951d99d2ee15b6f5f0ae634ba462d4cdd99e72b9a74c3add5e1107a072c05f0734fc8f542098f6cc28bfac791a29df09b52d3a31cbf862c07dc452cbb6a93c04b24d2a51046a8ce48794ffdbc0a75ef9dc4b453bc83a5accab44fa041fb161d47059d519db972c2ff8067134764d3c746d1f799b99e454b6bfb6adc373eae64e317ac84ef07c4f99dc18401ce82121677b7ab34d990e64758df24761803c038d0d668803710482622783370d5d5242d7258a60b0eb954bcb082e039ffac67396e3c21c8e5c5875b46e4bdf7cddb0a3bc8b7107ca2af32cabc2366059ddd7edfb650d673bb536641355d2eaf6d7bae394cd9282dbba51037aad3ed6cd6ca0ed55dee78b3eb457c40168431c2878ab335e5d37cc430803741c91f9f8f499d4b598b9014ef26b0c7a5988e6219032f8d9f88717bb2283f166485b1e6ab48084bacb3282187b29fbf6cbf38affefb2d1e833069e6972aaa13135fed18667217737eaaa03a60ef2a176e86b33b429a4dab4ff13d3ae403477a8e38344ebe62a423f3fee70998c239509200e244dac8a7dd9c5f0e04089bf10069a11058e5518b86ce072aff36b4d875ee63a7b286da4a92882221a6933805d51e4f93666ff0c452b8eb03a6187c4b7bb8eafb9f47558e62ddff7710bedffbea6f3f4bacbb3aa819c2fe9434f23d8643e6262a877617bcf676d4c1ca928651335f0db50edb652dd3cd4d77751b88aed0f60e7230ef4d2d8f70dabb41dac3a93644c8d738481f44581717eccd591ba6cf0d26f458cc88fd1d0fb8c52144153b9084e4a22c1ac4fcb0da4df91e7329f96311d45bcd495e712a7aafe7bddf5faec39065e068c1ef011d14f5b2a2f1153ea8883ab409306a38eb5f3b1b69543efedce732791b6fbc3ccb1dd34b6c440cbddc60695fe71d1627b6eb36e4ed49e3a54376f6b2c91eddc78ad8252953f70473242c4813eb38c7cfe976ad44f12ed04ca89bfea18e7b7080341458091ec142021fd2206e447961f323849c8f5cbc88ed45ec3263ffeccef63a5f735d8c4791245901ff2fc4ded68508804afcda7e506cbae262e14a75244d3fcb8d77ea7892d337da20624d7c0d900aab36f9fddaa33d1d6d20615076be51f08e01c8e3bd2d6cb4b85aada79d670594c02d5878d71138a65aff8e83b5c3944825ee9ee3ca6cdf6dca2edfbcea28c32df6b9896844c5fa1243f32b5338e22b557b0e4bbbffffe9b5268b741dc37e46c4966cfb98627a7f0dc1726cc768562284d493ee82502888172ac03ea587fef9a4372a30ec67d31603cf9f03e1b50ff516cf33333cd8b3677eaf82e5316e64a19ffa72dd46f99e11839deafad612de53fee6adfa7ef655d630c785e2781993af87f7a7efdb780b39d3ee596d530fcc599bcf09d79d3689b138f6bce9ab03fb4fdcc4c7532cfda7549c507dfe548ff0cd17675a6f5b5e3d71ed41e5c44287f29f7650bc2409dba396d620c2bd54d97c8cb5f7cb6abd5885c9fe4de62532f1a6aaba3d2d8ecd29f3d1ff296978803c330eeeb0c2ebe86815c73d58651a9510cf340467a6b065a870581a996ffc9001ef771d07ff2e17def234a5a1609ca4281181459db0eabf63313353cda9c3d799597c53c82615d36e4665d0ab12c1984b300fd9053f96eb597558d71489cab715be51ee8fe2f5c1d004f4774575fb1d1be62a3c7dab7cfd0b63ed2f63ef1ac533fbabecb0079928238c73545ae3b15099681eae4dcd29e7da35130a9d9d2b7457d0c58378bc917dfbae92c2205105e7795c7e3244c1dd1a0d4568bf2f01d9b7f645901e240df8dfa3a1d7b1d1ed4b858f9a8921e1d55c899bbc694de1e8a033278bf1cd023ff4c24416bc2ccba7cc4100cf4790be3ab303a52897ea97420b5ff2f1c9b694d634ea268ee4319b681de4ff9dd1486f25184725e951ccefb5d634369795d88b22eaebb2caed946596b68f265cd3af3f80cbbeaa9bebfa28d35b1d4a5100e0a8aa83063be44b71584ba17abe89e525b2deaf265a0e72dea90f175bc341cfbace67d78458169b9ccb44d1d59b49969089b33b1ba39d9fa6ca87bb9d52584b6e3e071a97f8b3dfedf947e2fc61d537a2731cac3babd02e2401f0c7ae958e72d1bf3d7dab8b310e1443a604cb4d33e0f68042e7c668a00716080fdca548db694d61d1606c5e680a15566db21288cf394d753de6a3fb53cf06e9a8e18bbc9ef67d260dd6bfaf976f1ffe4c77f4bb50e042c6bd7689343dc6b997d3fa0ae72e72cb6d6e1494bfdcc83f689331b675dedad652027ec41c58af58e7ebadc2f8f1ccbc77b09a80a010b13475c4c999d9151898eedadb65708cbf71441fb4868bc64915581e0b2a5db38d7439218cabf0b95b430dacbcae03665d5721ca903ef5cf82c40cbfd8a188b4b9d311563e2c2b46f589d6dfdec0bc5ccdbc2b28f1ab754ee4d914262b0ffd6e2b54f4d4359fd6516569d43b11fea0a32c766786407ea705bced791b6d963cb3a207dce24d0b2cda3923d188210f9aeba980f2904fb222c460315060eb557401ce8a5212f9dfb54b71f5c26d0119ee8d1f67d24954811a0837d8bb49dacb4bc276434cf90e944424618441b17f17ea6b3dd531366d9c450ca6ed5a367c9028a04d86eedf2c0b8d2eff68a3800ae22c1a434db7739d0a260600108ef402ccda7680284023f248249faa455cd28a6be1b7d6d3fdfff9e1fff9b71dbe62d349b16daf8469dc2b9461314917cc2c4e214c56ce4ff9d1fffd700daf33af1367aef590f0a9140ea40b173431362916b04954b39dc0c6cacc92afa96a195c710c6cd6420e740e238267be93a4562a939cb07001aeb630aa16062fc332af7951bf36507868ce200808ef6f3e3521f3f0ed4cf17f909e45861b701200e40f39dfbd4f473a6afd5ed150120ba11d90564d6abd85d01310000fadccf1739a246e64b92d743b942367a14f9a7d6d86b008803904ea73e325f4282bb9aa4450481a5416d06e8427f53deabb90f19a3cbfb376718ba0000000088037d30dc8b7d4d8b23d50ca677e6ebf0330c71806e0b0623ed73ca3350294519143bae6c4a42c086244f00000000880343120bca337c6d8405177bf466e64bf8d986b70330a83ec898af93a04db63eea2a2614ce7e41797bd5f2ef440100000000200ec001837db265a08bf17e5cfadd254cb86ca46fb60e0c73000000000000c40100000000000000e812ffa00800000000000000860de200000000000000c0c0411c00000000000000183888030000000000000003e77b8a00203cfff53fffbdd8ceadbcaddbde1d22feed7ffcc7773d7af689fe3aa97aee9c9ff367cfa831d43f00000000401c00e8ba23268ed685f9b46fbb1c67037aee893a9a83796eea1f00000000200e00c02e160375c8927eee520483e97974c250eb9f6d3d18994fa289709fd78535a50200904c1f5d8e6adbe47df4865201401c00e832f7037dee2c35a754c3e9e7f93135a5b0f9fcef0fea442f72c3e39e2a3b1883f31be124fffb5dfe6396d78315a50400d05a1f7da17df4c9d6df6fb48f46c8056801121202d44706b757f9f1b31ebfe4c7ed40c48157fabcc573dfb42c0cc83dbd305fe73530faef97f2fffab93e311f68fd3b54172666bf782586e8eff967a6745d0000adf4d1d2fffebe2d0c28d26fff411f0dd00edffdfdf7df9402401c4775bd67e0fb869e252494e73eb5fc78b08484f9756526f8dce2a36ff26bcea87fbdad7ff2ec1bf3ad4014b5fe0144a8cb13f329af4b39b1e8a8d4aeefb4ae1bfdb9d176bf26341b12afd7ef2c3e2a117f63ea3240b3b0aca0ddceb12d58d31519095dcfdff13cfff5ed001f5f9efbf786dbd3d85218105ee49f5ff4b90d50ffac8481e2b3130390865d2022c0d47c4a306ab364eba42414ec5a3e93e5c78a253490601f6dc391f9b24c100010077acfbb362f9e1b0ee57f4a28b8acc35e1b661d42920df1a1c510ddaa5f4d70e1f1f905f5af97b8d485334958487f072d8fc72375822e039ef644cf77a9395744209853d7a1e5ba2e02984baea20b4a0da059c83900463b6a99759535d932e3fb67de816f6476556764c1cf491623ec61a08fdf74ee8189e3e78fa97fbde5c4f1f3237a2b68cb51ca8fa58cb98185816d8ef4fc32b62f28796891b147dd0500c48141f0461d2839ee1235b025b1db1f2a144c79655e906d17a87f00b02d0cc88ce8c6421490e4a2e584a33f957eff2d3fae1c6d881788fe0000b00f9615b4c4ae84683a60cf8dfddae97d3c949c0299213dad793e110adeea1a66b600031b32d3ec36876b93d8b68ad01ad2ffb9cc36b1b525342d0cc8ecfd8b8a8fd96ce79695ce3951fbc1a61f1c1984436807fa5b00c40170100c64b0bec8077917c74a660c96c62257808a0f724cf4700dbf2db600bbce7f4ed92f1ea735b17276211b48b96c0658ffe4ddda0aac0feca50d0d0b03325e1f8a1678505160e9683f48bd9f6844827cf79040267600223fb462e76ab24c5bfbf39a520368169615a4898b51b0cc3b5b4932b4aa4a34249db2181cf9218efdc87c0a4bbcf2b83f31bcfbb85f7c0c10509a3138a4cdd886d6de0e68fbbacd00abc322d26701ea0a03330b6160e22a0c6cf585e2f44fcce17c238cddd0151b973e1a0071009a32e8c54112a120fff547e39e40ee14810012636af19907c3b648bd46851f1bd15344a23925060d0903e2b0bfaeeac34244b2e8390e0904e41c8036fb68e9776f2d3e7a3520211f0071002a8ddb26afb7c90f31247ef3110878639050bbf9e580415cccca1146deffba30359f92beeee3c6b8ef7001508765c5ffbf0999cf47fbb929c50e8922fdef75457ba0fe02200e40cb06b5846f3d771508345121400a75588ceb91f924745dab1378adf57a843030a8ba2021dc3f9aaf77869188829f450c25670a34852e2738b4c65a84cb798436b032cd6f2b0b605337eff343f263fcbcd547cbef3fed4ada0d00cd404242d8eeb097ba54e0b5c3d75e4a92a5aa9c07004d191de6d33a45d62a5217a44fc2c884b6a9aa83ab8862d5343ffedcfa1bcb0a20953e3a3344a00224059103b0abb316a7ca3543ec9c92030000f882ee1e5095997d19713cdf986fa3078e783300008038002eb8ceb65de646d08862030000f8cc8585039f45be8725af0100006c401c807dc6cac6b86f737841c9010000588f8b4de40458f11a0000c006c4013884eb9a6dc401000000f3b8a460641208e1d77c0624260400804a1007e090412199ddef1cbe7246a90100003c324ae85e325e0700005481380055388523fed7fffcf7094506000090d4ae0019af030000aa401c802a5cf7851f5164000000e638a131f3abb15cb72c060000f80ac401a862e3f8f9114506000060c549138ebae61d902d8a6ff460ac0600806ff89e22800a8322cb0d170a020000200e92cc77d9c0784ed26000003808910300000000ed31a30800002005100700000000c2b3b1fcdce97ffdcf7f67561f00005a876505900cb97124999d4746333cffdbfff88f794bf731d17b9075a0992cad48a47c8ef5be4666f77a5159532a49a7d6babe14be2dbb89fea991f7ba5da77720f7b0c9ef65d3b1f29c68fb181f708a36a9b49db6fb19ddef7e5c2aafa5cb3bb7ac47f7bafd6cea6db0b2dea4fe2c11c481c73a21f564087d77aafd62a98e16f57455550ff53b93ad67d9e818b331e03bbe7cb673dab205eb8c7d6dda613ade8c4af6ce366b6d5feb96ee6fbb9d75c67e401c0068a6939d9406d6a3ad8f3465b497efe1748fa1d256195d94eeefd4e17b777adf991a38f703ab5be3adf77ad2c47bd541ef428f738bafbcdc7a5fcb441dea51e9b9ce1cbe273f6ecda7f5d4ab368ce5ad7e66d7bdcf235f7357df961d721c6bd4a307f369fb5929eb55cb75a6709a8a3eecc4f1fbf2e3ae70b4ba68303ae6ec39d2e71c9b9ee1d17f34d22f96eae8a131767de099e6fa4c477b3e230920173839b5dfc1bcc5fb93f63875b5c14afd7156ea93ef2396e145a9af3d72bdbffcde960d8cc3c53d9e587e477edc68f92d99f4421c80ee726f61204c5c3ab0889d947367dfa02135d301c9b78ca4f3bdd463919f73a546caba8f95ae24f25cb451b74a86e265ddf7a506f13cf660edd056e62e82c00ea48dbd96233fdf95d4ed9883bc1a731707c48058d72cfab5f300f5e8c2b30e1fb55d8fb42c66359e61bb5d9c94df6349705a9b2f9152293b5fd70e7542961788113ced49bf3cd1ba705ee3fd17f5f956fb8eace63d95ed90aafb9aec39c74cdb6955fd96f39fe79f1707672ae268fe7b1375756611f110e33ea42dce2ceb45ea36d8548f931aa73a2aea40c90e9b8712c9038d17451d9dab8db8085c9653bd47df723cd3a3b01fe644e4200e401a9da4d3e0b0c3509cb63908f8aaaa1d34a46c1c86cf464a0feae6b8f45e4f5bbc0f5b43d1c5207eabe79db621e868d92e2238d7520f2fc4600839b3ad11365e33d435af5918b92735cf75ac75e845c05b2cead185d6a3fbc8e52163c5b22141e6548fcb0e08062bc73efdb2109bba3a5316a9ff90f7fd4e67e39dea73491098d6192bb49dae3c9e4b3eff67fefd570db58f63cb7bc206dbed6c5f4638fd5169fc9bd5116d238e17afd599af6d7744ea038af25ba4b4d404710086889338501864d2784318cd013aa77904673bc6bdae1abacfcf464a573b577576166dd62d4743b1088ddd94da948d132b466c1141d2e47349bd7819f1126224fd9e5fe779dd59ed06dbcd76f9cc4219b85a9f97110d66291f096f9f440c6b75ad33e2c897ef651ce0f9770906375b82411b91535247df7a3c4ba6225aa7a2bd2ceac283f97a1261e4d8974b7d5e4bbbb1981d9f987a82fbd996e3b832f584e8c1259dd40885b38ed4db60fd7ac5f837359e5b975a8e1737fbeab143dfe32d60a8c0b0b028cb1bf3f5f2ce89c5bdca395faa40c03203c401680997f58f375bdf3b69f9de8fbb200c940c9e267959ccb676308a6064d21006b20a43518ce0f9be303dcb70bb4962cf141299d5beaf194170dcc2eb0fe1c816652e75e34503f77caa8ecd24429db19d49bdd3fabe73ed6d693942c859bbb3d2bddd34d99e0ae459351cf6d2e39dfd917ff7b7d0a1be2df51f7bd7df976696abfac38213f345f05a578c15e7019e6daccf56b7dd4b9fbf31d56bec5d28043039af75c44cfeb9ef4a89ffc6a5c3f519efcc9735f5d9218125d17a3b5667bbc9e8c3ccf35e9707fa915b6d5fcb03a2c2ccf27d1ce9f86c5c0502b56bde5ad4d99d11ac0ed11b13ad77803800898b03e54ee47e876810cca8b664b335806dd499384dbccc0b355506fcfb52344639d377b1c6b98e932ce5b0b630b05263bda36e356d84541913220c1c2c5719748b5c100706c213319c1b08093f64fc16c69ffcffe70cc7a5accd13e31f25543743fb46df7b79367264e28a476b7538cad774ed578ef3e75eeff8cec35659672583a9388af276ed4bcf64762c54c490a3985419a9a4f56aaa337875676853c3c6d8ddc7ebd2d2904dc20ed6befe43eaf4c521a755dbff52fb03db655a472a101cea3fb6a3368a88156b5b44ebf93280edf2aa341eac0ac746fbd195e3f9a54c677523aff60835231531aa66d12bdf6b698c3e2bd9604df4d1b6f5d6366aebba64936d34774479f71557a167e3789f557dad4dfffa58e7b4be2d2dcb5f0402eb24b07aee2a61e0ea504e15ede3a66a1b1d7a3763c401c401688f89c360556ea80b6dd8593170373d33a91df86f7a0febad01e1f7c4caf9ae28b37d864ee919b22da36c6afc9317160656970402193c7e29d72d2d8ba9710fdff531286cc254e736e5a9f73fd510e8cb03836016f9b17619f637fa1c59856129ed7ea686c1c2b17d1fa92330f3bc6fe963be49b41979b94166766c855931abb3ebbe8fb6facf853ecbfd1e836953faae4be8669959c0704cdbbedc69f988f6db8501ebfb0e0be1e6f3f6aeae067984b148d69bfb2ed711e76a9de25a5b0b61c0696c9128090d45cf2c0582bd11311ab5f19bf9b2b5e07de99eff085ccf0f3ac8fbde9bee6831316e9109d358bb91685f33d731e9507dbdb0741a17662b41a2da826bd3eeb2531b7b616f023cad4be531d025fa69e5709f5576b36bff9a95daac4dbd5ed908f82511adcace9d59dee7aaa25d4c0c44e3bbbffffe9b524890bc51d8be98686bc71d0750abfb7071cc25ec2d62f9da3a0fb5cad7612dee3feb18ecda31cf8cff9a3967232ed073ff1c327198a8dc960687d77bd572de5494f15d7eee91c7b9d77b066befb062cffc010f758c4fcf6bfe336474844bdf15aa9fd119b73f7d1c0735b4ef3deba3abf3527bcc70580e51a7eeba3cdb6fa634ab97e8981eca21ba53676b95c0335585dbffe43ba6a863f0cef2e3cf3dc29f5d05c407757e563a068ccce12d520b6e8d457249159d5fb76df759b6f1abba3b6ab888f9a16d418b6bdb46451c6a17cb3d7d97084513873ee3501f58b77fadb265acdfb7e5b8ff3ce03285dbfc5cbddbf63515fe4111c0016c67f38a592f9b4e3e9530a0a466c9eb3a46f27d3516c460b9f638c5e30c8c0e185d268b7cfea9c560baaa71ee5d34f94ec4511dd569a75a0f9f077a76df7b58b7d08637eab8b920469777a240fdde441d9046ca5a9d361b61e0a6ce5a797d36db31682c867ccaf953f4794224a4137141127a661ebb0985163b0e85c3bfaad30ed5317b65f9f185c7d8e5726f85833f2bea99fe9caba3f74fedf3aed41e721206f479170efd4713890d0f39b0218489754bf5b64a18b8d53130ab5177d7eab85eedf86f17e7f850245e88fed5b61e5d6abf7fa82fb0e9ab571ef7b9dc63d3f669d919e20074835282202b63d3d1b8bd4de011b33ebe371509e4bdfde669742e3b5e04b19d8369acbaa586f4558be2402d4775c7807ed5963850123a52ae7f5721f6b32f09040fb6ed5c67b67c9937f54ed540b7a947976d3aca8e6dfc79a0d3153bcfcc5b127597667f14c45d88996d3d878dc37c64dc9726b938a7d38afc3132eeca9240f99cbc0b59f626b3ba63c7fed4b6cc4e63d6773df7a1f5ed9b406da169bb765c210c485d0bb6ab8bf6ef575bed626979af55cb139aec5fabeaa64d0e9c9b1ae53a33803800493037f6e146ae6a20db8fc43742179e46e8f92185b80344ab5b150653a87bd8350037113af73c84a3ba6340b79d093bed41d48a8b38701db2bc1d67d98df15cafa97d834de2cf9b80b3f84b87fad685be599ee74dc0534a28ef5a97ec35e56455e55d9907bc9cedb95cdbd3bd435b5d3bbee395cfacaed68d8748cfebc24580f69814a5489783cf1d3af9ef964030b7bc5719f35f57d8dd9b86dbd7d901412aaacda8cf7ab5673c02c40168a813958ec9266cf4d6a0e8a56e84fa08048b0e3f76ccd9885103ef4c06c1eb96ea4ae873de3b3a097d583fb869ab8de93bb415637c8d2a5b876419f0b932cbe7eacc1ef2129e6edc226baa686ca9813a5987daf543c8fec4c1613e892490343dc3bd0cdc1643b6f3abc04b776e1b2ed743f93e5e458c6690f6feb343bb58d4fcff5836c7acc6d85db76cd9990071005a14068e2d1ba1f55aba013a91a90904ae4b0c4e755d1e8471a8063b083ace84852edfcd00eba86dddf115622e5aaac399a57338ee50db903ef679e0d37e5e6a10f1d6ab76c85846b8e63270fd4c195bc7ef24c6cc6945845ce87ad588fda8e57428d2e5ce449c14d1652799e5bd4e4d4582cb082246ddf665135139ae59862b075b02100720b030201d585536e5bac240d6f6b37658d4f0795619f45cd75f230ef853d741c97a561eb68e62e865054314076c8d3ce78cf9ea78db2c35bb8dd0bfae1b6a7b4df7cdf2be7e8e60f4be94dd4f428b25ea385e06aa838803bbebc4c661bc8e314eef2bc3ab94137ed6ac3f8b846cc279d3edcbc1f1ae23c08e02dc6adf6c23c401e88c3050a5005e9b6e470c0c95a9a3017ad685045f8952cb40edb00156571c605ba2fa469ef58c9247fbb67d3f31c606dbe71a75f09d65c67f979943c858fe47e02882aa733dc408cdd673da8c5f473d59876ceb005e46c8d5326dca296dc8b695e7390954de29dc6b2c07d9f6bcbef64d88c8ae4144fc220e402a9da70ca61b0b6140b2ef5e200c74d26990f7eb1a367741c9797116c040bde9517964548946b1ad3bae8ef4a8c5f7bde979ff5cec3223510477814fff527311d472222d77308ad9d66dcf3de9417d1067d556cc0f364e1f58527053676bbf969957fcff754236edb4e2ff1f22e6455835d0bee635ef11710071001a100546f9211dc23b73385c548ccd9feaeca90a49b0306ed1038803fe03d3a2a631bed67677d3f501510d2f9b7a7746156bbc9eba306eb10ed98a03938eb7952c3fc441fbcd845d6a206d2bab397367b35d59ccbe6a30e280b2b4fc5cc8a4d01735ef25351b57ea42d54cfc2a917b1d598c8131db97edb977dda3ada0795e339fd5a66417c9c1446524bea708862708e8e039b5e888a4c1cf63643287769cb4fcfd8b40f0b2c6203064360e9f3d5563dc6b098e6633ef9bc34a7d6a06dbfae62a5e1d77a49ef5a1af167151c65de9af2f039db6dc27f994938d589cc5280f1535aa848d072dafbe4c62c873d8ec1a250984478196a3ed1a77ee3a6c034edbaab31d6b5f855f5085ecb032df631bd9e6b191be6dedd307e97726061007a076a39fab512703ebc8b2014bc2c105a2402f593a8803460dc98c62fb3430e5e52106e891e5570a63fca2877904205d6ceb9a8c097ddb1eaa3733492a2a4e55d0952384b876e423106814d479c0ba6735f6a8c3745161b77c1605fab4e451c68cbc0c6e2cdffbccd48c205001e6648f48d155aa1cee8784c6e669c3ed6b6cbe4c14562d297e14050e9455e6d03f491f24b9509ee363200e407bd83a82776a282e23ae6982340c8e5b63b7f58c30a2d4be1904cf1d3e2fe52ca2c26ce003a18bf100cd8803b138e61504edb31f67cbd4599e076847629c2f1da39a26b6e34b0d67e558af5308025522acd82ccbbe89025b2c2ddff7d4d45f5e303d700f9d434479d3ee3218d7ba6f63936d6a5ea7dcbeaa260a1fd427985bb4eb9583af51f056dfd18cc913c40148875bed18e5c8100406c50a71c09b85a3385018e36f75addd9c480ce828b60e58f0dc040e6be57b3b8e69bf3151837a613cb6a32c71aa4e9f6d5e191b71e0cef3bd160e8bade821b3e9cb2188adf28c1a3952e5e41e69845a9d48a05de2c0558785179b3abbe9d0bd3adf6f69b9c085fe3cb26cc70b6d63f796f574ed38e95470ae7d5aef227f100720757ede369e688083478c4c5b95177160cb407708f5dc46bef34ebf8f48005d636dec84b118890b470ef7d8f73e481cc0952e199c19fb654edf18e60e0ea5cd3bad745c4a62c0c4c159118a59ccc500273296c62ef7c0d4782e133a30cbdee525055d1207c6966d7f63290614878b8078ad8280afc024fdd1ef1edf3b527b7486488038000d3a339402ec7070431be543420cf23f6a7c1f9100ba88ad217d1430419a8ba17f37a4f0d4fc59e79ab47069fc971a2c2c1d4aaff36b18f3d8430c28b82dee71c00e836d6242117b8e3dcb695704c96dc78598d30eddebc4b37d8db7da976b3451b1346759b7ef1451a1c6c4092201e2000024804f081898cf2174cff35fdfd63c152201740997fa5984be87c226fc7d35b417a206fd44a3085e7a9ce244963b1d0ad177d892f558974e150e8baf9350e43f5ab016d93931e1d4b5dde9fbbdd8234a741215a5bac4b1e5735d94c480b1f18b1a2aa27096116c0eb9bfb5a9b7e409912001fe4111000c123adb7a069b18d357814e57880499860502a4ea88de5a7e3cd8569c967b9577da9909f06e441cf8450d7f57e615ff6fbb4c44c466114c5f7808032208bcc98f9ff26791a81392947dcd3262bbdbb5a4e0a1e3391dba9614d576a2e677759ccf1c858107b5577ec9dfab44974c634c46a8137fe1d90fed1309441c9bd105200e00407c4840597f209ce63f9e073ca50cf87fca2ca0c36c1d4093d83ae0273a8b1c82b9c567ae86ee4cea5ae18987617ee290f03124bb0401c6a5ddef7669f95e7ddee5450d312255c6d49a9d82c0aa81babad6f2bf0d744a11095ee7f57add523f853800008381c8817046dbcfc62353f701442dcf180821d1fa6e5bd71775452e0da3ad9a857eb0141086f07ed69e02c1f4c0ff8d02dea284c7ff961f3f22083863ebb0cf1cda97b4cf5d494617147733048e161487bc10dc1a130476f4431bed87de043cad4457fca14ba80071000010119236c833f349297f157820cc3ab87612facfd4f27332e3e36d98aad16ce310cd0941ff4620983a7e6d12491c1021e971f6323ffe99dfdb243fc825e087adc37e51b32d5ff7e0fd7469dcacd3be8ae800896014c16d9c8ae0264b0ce45ecca7c993db80a77ea98958017100005a82591dfb81702e03b409978b409cab773a7b0a904a5dcfcca7d95f1bcec490738d20d0cfaf4cf5ba5a594ec02ce7b7ef48cace65d62e5472dabb2d676554cc5e9254acf63b1587fdc666dc7058d2b3eb73385ee92262c0b5f6bfe5e88065aa828e8c17225a689f102ac2f21281202ebddcade0875fdf8a6131315fb27a0af7eae8c871ffd7bf9e67bc7e008860c04d35f44d8ecb00a715e76a42f82d2454cf8b25033619f2a50d8c352b7e651d56316c69290c4c532c1f2d1bb13de459362a1c36cd5caf7f6279cfe39a7dcc8d4406d03aa222edc276d78265c5fb1e996f45a1bb36c2d05ba453f555c4800e8f194bb565a6da379dd43ca5080426e618a0bea4f891233dcafea4f890ebbefa92bd10074a624071ec53c1cf4bdf11057696bf580c6e80fdd03eda17098ed4d0230701a454c72571e6dad2912fd68b5eebe7b3f24cb23a2a13756a6c9c9f371ab29a2aff59769a5b7a3ff7daffd86eb95ad7f118d12ae23b58babd5b557b93889d51c56cf2aef643144ec258bcd3a189042210ac62085ab98f586cc77b72c89fcc3f57f4f12212647d110b3a290e388801bb9090b779fe02370600aaa09da421129c56ed470ed042fd5e69e24cdbba7d5e185532ebe38184a5ce3a36bb79d6e2fb596adf6363808f6a8e019229ff98e503d19131e085c5e70ae76b1f7ddca5a0336dd3d3c61af7c5260b281288031f7c3cc87d4439e72af737277a7f6715f5488e977d110b3a9373405e507eccf343662a4495ff5d3b481b6140d6e948b2b07fe62f6a8a300060370b4d287b389140c3df7e34fe3389734a1212afdb5726cc1ed7fbc6f07117c39e5bde79c4b6bcea8a03d6e30ad4c276767f7aa03e4e7638635743147602ef16e0d57f0eb97d69be047907bf798e1d21b7cddd251288832fede527639f4fea5128c88f77b9cffa777e88c830cb8fcebcbf64c581bc10475a9852a8d261bdd3c2768912280c8a51fe72255a00451be0133621a437145314476ae239109e909c103a20124c020a0492e55a12594938edbcc3cecba403e2c03e5cca9cfea91967d2666c3e39b0dbcdb486e8d0055cea6c0a0edbc3d0db9726961d1bbf9d0da22f319325e832b96cfc924e4bb4dcebfcf823f76737f9b194650b1a058f386021084874c042a303fed4c294423df2381da20040bd0131a398a20e843e4ed484d283149190720d61cf768cd9b21ce0da1cce567da74e8f8cddc5d677639d59eafa18de5abbd5dd25ea7c7fdd85e71c184bcbcf4d2d9dccdb9e450976adcedadeefa9ebce2f1db38b36bab381abf3dd58b948e4794924f0994093881d598227d1efff99fbbb994e848f527a17ade71cd0a40fc57114e0946280cc583a00b0d7881f59b6b515a51575205cebcc4ee6d0f711b60b29f629fb923789c33f1f60ae8cbbadb268db0191d9b8aaa8cb75cdef17467ae793a67560ecb04d4c2809db665bc93fa73bbed7b74484aed12e6d273795b677e670bfcb9ed7efa9e6a471c9d134360d4e68a98f39d19c044be39f33a1c857f03a3fd79ddaddcbb693e5b7220e4410048ac178ca1685fd72623132a260e360de916fe0abba38375fb66dbbcecb2648789f0a0462acfdee309000a4d22e8ed5303adff1dfaf5adac22f05365bc6a2ec3d7fd162be84fb9a9f591bfb259db3049cad2120edce2631e1b633b93d763df450bc73b15d4e12b0355dee779692389097dddfa57ffe14d06e9ca9ad6adbef4c4c0bd1aeea73ca32f8b9de731d9ff644dbf48bb68582c69615e8fa8aa5e60f1043f832a030f0462a11c240ef1851045198587c86a881fd9c870c61538781fc0ed0356160a24ef02e61e0f9808581434e5aea82c63e5c6cab699f439f13c276b67f566ab3c73bda6befb62ff4584a336df9965deef7f4402e892ed896b6eff0de7448649425ece6939811ca962b8482224fc1a2c9848651c5014d2a280fb489200808b25ef797fca5ccc82bd04b3030da3352d9efb859439ff2862e0903624cbfdb339edfb2e5e64e63ff3261a7f9a162e6d4452c3e32440e34e1006f2c1d91d35246fe5d4e705fdbea7557c4017d972e89f8e68996f93470b964c62f41615b02c14677367815f8d465a160ad390aa28e25c1c501b9e1fc9896920abe30fe6b310e211566ac7b51423f617d7578a37e62d11eaf58ced1ac38a0d1030f142b74a00f917e7911c891ec2bfb262bda729aab96236515fdd3bda3b335237aa0116c1dfbd91ee7edbac763bd4b3f14753bbcc0eff2b13d271a3d701a61dbd6ce8d271a45f04b249b4e965948b2feffd468fc28f5209838504409984fa1696f8ddb96833ec2c084a4839dc5f6bda5200e8c7a56f63603e09c2a5ac97984fd91c9f1005d40fa87a3c4fbedb659a7e2345b5ecfc60077715e8e4ccf93a6a58046e8d838205375dab6edf23e47acb93a956ddb3daeed6599a800370d7cbeac8b954f27ae2726eea48f44e3bfd3650741a3096a8b03bafda0144211257014b9cc0b61806504fd1707268803418dc491a9cefe4ad4807d9d0d3d08da8803441740db9c57fd7f04e1ac2fe2401b21f736e368a523a5d14d772ef54477b180f69dca5d62cd5ddd6d2e5346a35d5cb6c493e8815997eed7a43191b36d9384ce39626b8f26e7136a22c1d802415117249aa0c84d507bfcf516075414908ee59d85b18030003e8df808e322285503c98361ada8cb00157a16d0a65d105d005d60356481400dfd7d06e1ace1b2a91a43afca5bddd51c43be715c238419c3d7d8cefe9fd67c977db479bef97ccbfd96ebfdbe486039c4b64d1254007598ac4ad2366a502028ca5e26e9ffd42507de75d9591cd812059adc564b0a768a30d00bc3c975db16a8891a6855510353072311c2cf02da080d19c50e1d401c913ff37e479cc38b81ae3f3f143db06ca8df3fb61007ac1d120d6377491026cfba22ff40547b4a9c27d70ce9624faf0652366f1cebebb243f72bbc4d50800b3671622bd6a41c05a302c1bce1cb5ed61109be771005e4e4a2509eb754be8b36f67a8468c86066232e3d265e69b1e18fba5ed0a5bdc80ff1a6c53db8bb6064647939eefaaf97e200055a8a6133c0af22d591d86d6c64791fe380fb24db5e73c4521a276e8d7d4ea14b3da49c1fb61c66d7fa76afdf5f7744c4cc0e8c7132aecd1bd8eeb16adfed571e757f9a1f7f387c5e425ea5ffbca09dc5b38f8ddb64dd6a401301d2c62e8c7d62f4331dd3a71db95f536a5f6dd8c9eb1d75ef489f23c4e4898d5d749d7a25ccfd5709f7bf30cd4eaa1763f085e6045cd84eb05b450ee4279597fc678bc2c09d667f04bf8693222e0e40f0c42b0ee73be9411d595618f392b1b82f111a3167a81e0e946f88fa583568dc7938ce9344decba885f7370afcb9b6eb5f2a6dc53789d991d6f1e278e978c89a4a8958fccfbcbd6c8aa884c4c58143bc8c1912ac336e87faf55b9f77a97d90eb565d32feac63665897e78d14a1907c9bf6c807914a22c2510365736fdc7717926d47972dbd4bb95fd77e41fad67731732648dbda338bbfcfd97c11a8bddbbcbbae4c6cb5e5c71ee918ba5681a29e38909f64ac5b12be6cb9400735a3e9d8a0461d7d4c978eb798790815a6241defc6e1f3170dbcf345a4f34a399f571888310c54db7a19da581c476c37fb1cf3b3008684cda0ee33b01c27d28f1c07fe5caa46fdb8a57aef730f5ec2b28696df987691314166447ecfdbdebdccc2a716ba6e398bf736a240b032fba3061e9769face1e6bc483eb6c5de1c02c42be2b755aa44efe69dc662a4731db49c236d56dc0e8ac10edd8e61d8f6ab64579dee73e02411bfd8af61dcf3dbefa3abfdf2c74de04e95fd566de55c70ef573b572cf582e8bbad3312979fefad7f3ccb82dcb8ad1de7e974d04aa7636f8c70161403a59091d3b4da04c8716eeecd2984ebbb89e4f3b6b17a55beae1a68e2125df958ed37cda6ad365578d690345f222e440a40653660ee71910037f1229bc30a693de9663b4ae3024e6beefcac2a8bd751d00f5bcb6fd773467558d03dbfbb80855ff5b7af6b6ea7d63e240e93db569e46c3b9d2f757c989bb4b071a0df861687d5593e3d200c4c02388853cf3af0a2785775c63b8d1458aad3528c732e6b9d9b6827298a0349440d38ae93affd0e74fc745dcf2ff52a0b1df122e7ab9a50d0fbbdf238bd446515f95e6a39e6da4637dabf3e467eed288b7545df5c27e7c8dcc2569f9a6e9125700f3261283b1becadd7dffdfdf7dfdba2c0b1761e970915e63f879488509d3a9775296fba1816ae33f2bf7b7cf54eeb6876c8c0d10e69a287eb1aae5d469ebc97e3d260759c5f7f52f18c73e3167923c6d6acceda31155016159dea55ac35753a78bcb3fcb818aaa31002850e847f3a7ce5679772d6727d5bf1b12b7d7ff796e73cd67a755a5146cec6bc3a1c2f1cdec324c68c92c77d8cebae4dd6f0cad70efdc9b86e1d74bca6f063e835d81e6de0b7fc1e169ed792babb32cdafa1b4e9432729aca9b6ec3342f6fd237d27a74db473cbfeab8a2b3d4756d51e746c29c6f37dd7fca9eaf9f4be37c67e92c0bb9d345cdf56a67af9ef3f13691b4b073fe3a6cad68ad426b7ebe9bc4e9fadf5775eea336deaaa4b39ed2c3bed13328b6b8d4b36f3b96d5b5001e124a47d61f99e3ae7fbe8c4fbeb846ee979ee5f2f0f8a032a0cd4ede88393dff87703110564609f3918d2dbceeba26bfbd67a0821fb3abf6d46169dd53ac0b50f3a981ee240f99916b649024be157738be79ec6483ea8f57762214cec328ae73a78dd7b5cd7f6d97795c5ccc6287574bceed48858d634e40b7e71795f3ac0cf3c0c0aa7f2b0bc8fb971cf5553dc8773d22cbde685479bf3ae8335ae79a7d75c0510267cdb80f04aef61ed79ed99b19be16992686297c77bd938968d53df5fbacecc1c4e4078ab7d7f0c01b0ae0353773cb71adb4a1306730f3bf74afbeb75aa89152d265cae5a4cb457777c0a66e36a392d3dfbac6bad0756fd76a96f9eeeb037ad9cdb1a82c6be7e60fbbe6d23ed5eed4aa2ead0fedfe83bdc588c29550e74eb75d9531c08f92e437195fbd9d39de240aac240e180e95a8d3e0901d2c0c6e6cb4c74e8d99772072065b74c71400b34f3e0637c4cb5ecffa879ae5787324ed71007b6458cacf42e0b26fa0c63cbfa736d026e57a803d6d4616071793ff7fb0c0155df677addb3086d66b9cfb1b750c8b79dbf95beb37bddf1a0785f5335188e2ade7d6506e2b6dec38efb5894fab446eea3a56bb65ede6db6811ace69d304890809d04ffa8a270fda777ceeff8b7aa1c2e248ebbed4852a014e8cf279ccb2b08c588b66dc9a1d115b11db89571fd9507d3b3446fdd2f4ae44a53eda46e071b58b36c673365fdbd0b266bdb82ddd47b19b8a298d499303e7b71adfb7449595692749f68db6af7520f1e2bad4b73dee3ea36db5108eaa9eb193c280fada757d8258bcc9fdeccf4255792bc345a2c240d1d07a250e345039caeff24ccb2f3971a0d4293421107c33a39b5ffbceb3b3bdd58125f6405bcef0ed5b6f6ef4b943b7a1692483ab38e77a4fbbb73186ebb6997d8e91f493b6216152af5ee861f66c8578e89d4d2d8d9eb6dec3362f22b58143f7d1c6355328ef36dbc0ce7e5cfa180d6b6ecb80ddd5fe56a6e51d3b240457cb458c4297d9d2237dc7e745bfefd887541af5819f73a991804d6e795d15ea3d897c2fae7d64132cf7d809772d6d571ca38f2edb454b1fdb56ebcc441ddbb9679f75ea69b74ab4d6c245ac93365c8aba68cab9b4b51d33b5af6dcbf0bcdc2e1dfab507bd9fe497f81c20d51d765ec80604c51283ef55c9f009f16992994967eb15882010e43fc63acb1e63e6e95098b78bb357acdd5ad588c2785c636fbeac9bbc3071665a1ef45e17096526ee435d2d0cfd993a894dd655802451037b76c050be5307aa9865db54081fc5cf514da1e1318156dbb3ba3a5e4c4b635c8cbe63db695e36fddcfa9c17a519fb188ef9833a848b54c3fb131507e614cdce3a2be5b5ac2912d8d6db85ab28b0c3569e6b18ff3ca2fde8d47f683b1c598c0375ef69dee5369ffbda2393ee24fca33f94df63f6d7bf9e6fbed7e504a9771a27b24e6357d2840ef373c3d74bde4194f07c0d412b8ca73a9d74e11c57757045277bb4470c90efae032aeec5c050ccb015e1625335864f033c736602ac63b6a008d78cc5e6c03b8b69f4de5b0c843335f40b81a7ae117cadef6cd9a1f7d0749fb649e49a299477ab6da0240a5ca8c17b72c0895b3a0a94d9d63546e68b98ead3cee6a6e5e881edbe43fb8fa2ef980470488a2508d66ba1233fa7dc4bb1a55ab1debaced876571ad75cc6e2d8edc4b58f6ca48ee5e57e5d6a2b8f395c5a149c63f7d1eb40e5568804e5657f75dba56fbdb5e947a6a57c06756d9020fd478432bc2b8d219d1505caf67fe2f777a4e53df9eefff8efff676a99130f55ded190762d183a25a3705432eeb6d7f93e94068762562af3c88a3a335f66b6d6a1665cd4819c94ce7db0e32dad499f982febd6465b1dec4dc9802fdff3865ad36a7d2dded9c87cd97a696cbe169e8a35dd9b525dcd283de8585dafdaa9c069d70ec73141fa54d748c71f53ee1ff5b9c6a5e3b8a2ff2844948df6fdeb8ed499c9d6336e8f6dc5f331b6d52beb42b413437f91c2ee041db641b7dbe5b60d7a67be88439fc775f9d974bd2dede631d2e3d0bd36d27f78946156b28d7ad3ee7ff8f5adefee6c6df09388036b9376984399dbbffef57c6c000000a00d83b9c801b42f9cf579ec594a358257a6675bd1010040bff8e1d7b75563666abcf947878401e1342fe425550d0000203961e04d13e1cb1a6d2302c183e55726bc3d00006858189028896587840161fc8f0e96f5a508045ae0000000d0be30f09849baa9fbd15058dbcccfd80b0000d0a430508c99a75dbbf77f74b4cc65bd618640000000d0084b7378f663d9f4da668d20b8421c000080848481495785812e8b03460b7ca32f0000000022a08955ab8c9caca5dbb3c92570ca5b040080068401192fdf996e2d2528732fe2c07587df8114fcbbfc452c882200000088c2d4c6a068e3c62c336ddff20a010020a22830ce0f198f5e76fc51321107563d78272fcca728820baa270000401834d740e55ed52d6fc97953f1ff6ce5060000314481638d16f8c3f4234a6df98fbffef57c693eed31d975248ae0f7fc05652c350000000882d578aafb59a70ae2000000841606a6f98f3e440b14bcf9eb5fcfefbfd77fc8c3bdebc9839d994f4b0d64b9c42c7fc80dd5170000c00bdb257b220ea43adeae798d0000105014981b8ba8ba0e71a7cff4292161ee4067f98fdf7af6eecef3e34fddf670425506000088c6b8c56b9f55fcff8ad7030000754581fcd8e4bfbeed9930205b115f48d480fca3881c108160a17b325ef6ec5dcaf35ce6cf266b1217f9736224000000f4401cd09c0887b8b34c5a080000b02d0848f4dc343f663d1304ca48a4fde771f2fbf2ffe4ff218a88e9a14020c8ccc259fe7c1236215b1f2d0b850400000076b2b1fc5c5b0981a715ffbfe415020080a32830329fc2ec656c3beaf1a33ed7fc839ff9eeefbfffde5520a28ebc1ec0bbbf529120a3190000007c8dceccff616b64fcdbfff88f65c3f7b7318767737eccef69c39b0400800a41e058c580a9a95eaed6756429c1a41c3170501cd0029a984febf48e06501f249a60a9420146040000c01707fcded2169010fe5183f7553591f12abf9f396f1000000e8802131504fa1e2550706b3ee518d8e9f3ee1507b4b08ed5693e1f501db9d5675e2114000000e2c0bfcb52bc17961f6fc421d7ad13d7070c3911fdc7f9bdb07c100000b67ddc7149103819d0a3bfcafddb8363f44171a0548017ea301f0dacee20140000c0d0c50171c4ff74f8ca4f319300e6f7231317597e9ceef9c863b824890801000041e0b34f3bddb58cc04b1cd00295c1786eec670ffa2a146436050b0000d02381c0257a209a73aec2802c793cb41eb4f1dc07000090a4202042c064a08240311ecfb6930e0611074a853c329fb2fd9f0fb8aedda97192b1352200000c401ca89aaddf65905ce44e7a16f01e463af69e220c0000c00e3fb5482a58880247032d8a07f5d717aebbf3398b03a5c297029f9bfe6773b4e15a8d26a20a0000a0af02c158c73a1763eb8dd80a75d7fee7d79eaaa17374c0100a2a4600004027048149490c38a5441e77e39bfb2e89f71607b65e880cda97bc8b47ee0aa140c5820d450200000316083ecf60b888041aad2006dfdc1c0e07bd516180e4830000fd1703c62a0414c711a5f2799cadbdf35e6d71a0f4a2463a805ff092bee2764b2cc0780100802e0b0432de5785f7ef4322edd63a266e72877eb3755e390ac3af6af9e2e35a4a96110000f45e0c181b960aec4226a5650c5c84f231838903a517284aff54066c33ccc40f3662c1da1059000000dd1609e63ad6376da87d368688160000e8a518303144061c4222e6962e89065b1307b65eee850a05e7bcc383464e560806e42c0000800e090423d35cd4a0441dac88140000e89518501602c688017b91683919ff16312797a38a03a5975e4413c841a2886a6eb6040366460000206591a0c80f20e37ca844c5e51c3e2ba20400003a2f04144b048ae800fcc26a1e85f1185102ad89033b2ac5d40c77bf495f03696dbe2c47582318000040c2424161f8c94ff9f768cf98ffa0639bd19ff766473e020000e89c1030da1202880ab04796a18b18b06cdae76b5c1cd82114cc0c490c7d2b4d2118885890512400000000008010d0594160d5664eba56c5811d42c1d410515007220c000000000020a6cf364208e88f2090a438b04728900ac75a947a3c94c4828d0a06243d040000000080433e59e1fc1762c019a5529b6bf5cb5629ee5a97a438b05529a53216fb5ab2eb41386e0bb1a0100ed8561100000000607022c0763480fc4e24771864a276551204928eea4e5e1cd851790ba180e50771b851d16083680000000000d04b11a0f89d28edf0dcaa20b0ea5ac476e7c481ad0a3e2a0905f293f52ecd88066b150d589e000000000090968f3451c7bff0958e1101a2526cbdfb1821d0e59c6f9d160776348471492c604d4c738d61a30de2de7cd93d8144880000000000f1fc9ee392f35f440330591a9ff25281ac4f51d6bd120776349a8936980962412bdc9404838df9921011e10000000000e0b02f33325f9601948500a2009a1703b29218d0dbe8e95e8b037bc48271493040594b4b3820bf01000000000cc93f291c7f048074b8db120306e39f0c4a1cd8d318cb6201090ed3e05685834cfffdf8336f98194503000000001df237ca8e7f9104b038f03dd2f13d0a31603de4c9ca418b037b1aefa42418b014213d24ac676dbe441d7cfe4982440000000068c18798e8afe59fccfea7c99dfa0e8fdbb933f98838e0dad8cbd105631a7967c403212bffa4f10300000080a32f30329f66f9b7230070febbc18dfa0245d2f40d45823810ba932884823182412729962d6cb60ea20f000000008663d3178ebe30d19f85e32f820061ffdd1302d6252100bb1e7100c10082752ec67c59ba502c5f200201000000a0db8e3fb3fe08018038d09a6030d29fe430e817b2666953160eca62029d1400000040341bdb982f89fdb605007624eb0fc592e1cc7cd9161d1b1b71a0379d59592c981842968640b18c61978840240200000060237f3dd3bfcbe9c7661e86cdbc298b01e408401c1872674894c1b0292211be120fcc97c48a442300000040d7ecdcc2b9dfe7fc33d33f5c9b37d39f1b26cb1007a0ba332d3ace49a9134534806d216163768b0a1276754f510100004004fb7497937f8cc30f258a25016bf3252200fb147100100da0656ecba241e9f7b2b040e8160000c0f0ecca6da7fe7887e32f3f09e9877ddc959c7f4400c40148a473dfb53c81ce1c7c2894de82acf47b595c60a9030000403ab6e0a4f4cfb2735f0ee9179854021f8ac9a6ccb01c0071003a3f5894c58363060688386818f375024644050000003b9b6ddb912f3bf9c2b600c0241084a4bc14a01002b0db10076060035031f0201c401b94732818f3f572876d61e1f1df84aa010040c2f6d5b643bffdef72f8bec1ee82960480c2de5aab0090513488039402201c40d7b9dd120f8ac1ae603b8a4140600000001bc75e986cfd7bdbb997cf33830f080080380083160eb605040647e8fa20fa958060be161d84ed4195503b008074ec9232bbfeb6cbf167d203ba4a3139525e02601000007100521ba4cbc241f92703300c859b1d7fdb35586fccd7510e86811d0006e8c81bf3ed6cfc3e075ffe764a49c200b82bd9095f1dec30058803d027c360a2bf6eff443c00d8cfaee806e17ecfdf8dd91dfdf0f81d221e00a0628cde6664be9d75dfe7c01bc675006be7bf3cfbbf668c06c40180af0d937d91076294b06c01202efb448882ecc0ffdd577c5720df0340f538b8cf112f3339f07f871c769c768066d80efbdf1866fe01710020b8d1b42d1c948d24f9f711a504d0696e2c3f97399c3373bc078cb77e8e1fbb42d74d0d27dbe7b3e2f4237403749bed59ffcfe30c4b03017100203d0370a40618020200b4653486c22622a30eff6b7efcbf11cf3f097c3efa700068c5f13744bf01e20040ef0584b2f15afc8d84470030244398996c00180245645a11eaff590060c61f10071007002a2985a196a310ca7f43440000c4010080f69dfe8df912b95538fb2c1303401c006896adb5ac13fd39325fa21308850500c4010000fbbea970eabf99e93784f803200e00f481d25651e568849141480000c401001896c32f64fa936dfc00100700601f7b2212b67f675b2a00401c0080a6296f7f7bbfe777c2fa01100700a00d4a5109c2bedf894c0000c40100d8d51f6c2a9c7d66f701100700a08f6ceddab0bd4ff7a4f4fb080702007100003ac3adf912b6bfbd256a56fa9db5fb00803800007efcf0ebdb6d11a1bcf461d7ff11a50080380000fe6d74b3c7b1df94ff8fedf800007100003ac3d6b2876d216164be44311883b000803800d00fcab3f8c27aebdf65a79eb07d00401c000038c456724661fbdf23f3b5b820ff774ac901200e00d4e466ebdfeb0a679f507d00401c00004899adc8056164be1614845d9fc17902c40180eeb13d63bfbdf67e9763cfcc3d00200e0000801d3ba21804dbbf8d70c6007100c0ca991736e6eb35f7fbfec66c3d0000e2000040f7d911d5208cccb7910dc22ed1a1f83b791a00710062d799cd8ebf6ff6fc7dbdc3e167761e0000710000009a666bcbca6d267bfebe9d30729b334a1671009277d80bb23d7fdf1566ffd9a967261e000071000000c09b1ddb5dee6252f1ff36e730866809c481b49df22ae7dcc6497f846dea0000007100000020007b966e1c62e279a991d91fa9e14a6cf1e3ffcb8fff2501e7d9865de1e9366c1cef81907700001814ffbf000300d9bd5e188484e66a0000000049454e44ae426082	1	Srinaath	Kris	srinaath@s4carlisle.com		\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Management	CEO	2000-08-08		\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	3	f	\N
3	5	\\x89504e470d0a1a0a0000000d4948445200000407000001490806000000e7ae44f9000000097048597300002e2300002e230178a53f760000001974455874536f6674776172650041646f626520496d616765526561647971c9653c00006b404944415478daecbd4f6e1b49b7b719f5a2806e5c7c80f47ad20d7419620d3cba03b15620d60aa49a7f05d12b306b011f4ce35b80e90db429bc0b286a054eada0a8c11d7950145c83ee89af04342eba47d579e493769a2699119111999199cf032424cb64fe898c3fe7fce2c489effefefb6f030000108a1f7e7d3bca7fc8719c1f63fdf3a4f411f9db518d4b3ce4c7baf4ef8d1e4256fcedaf7f3ddff03600000000ecf80e7100f618f76335ec273b0cfb334f03be30dae56ff7b9e19e51d2009def2746eaec17bf9f26769b772a1caccb3f110e00000000100760b7813f2919f84d1af785e19ea9d19ee546fb3d6f0520b97ea210018abee2ace38f548897eb52df83600000000088033038235f0cfc0bfd7994d82ddea95820c70ab1a0ff7c7cfa4ceae4a3f3f9e4c3fb052592543f511c270378ec07f3b550995113000000007100fa68e88b183035e985fd56719b1f4b150a36bccdce0b01c57295f22c7459a0ba7af2e1fd94926aa59f186b1f31e9603f11532cc8e87f000000007100ba6eec1782c0794f1e4984828521a2a08b624011a9623303fd1b11048df611c57144891c44a29a56f9b1ccfb9f35c501000000880390bab17fac82c0ccf43714f8418df439b379490a0223532f52e5d5930fefe79464b43ea28810982208d4160a16f441000000803800298a02333d8664f05f211224230a4ce45d98fac9ea1007e2f40f8520c09281b0dc984fd1044b8a020000001007a06dc37faa4ed9c9808b41448219cb0d5a1306a40ebe0d743ac481707dc348fb86b6970ddce8cfc7ad4c77fc5ec564c7efa9ed9820d10422102ce887000000007100da30fc97118de462bbafec80312f21cac725a35d7e6f6b66f239b377ad0803e278fe1ef0948803f5fb86890913c5e1caadf97a8bc0754c4759fbc091f93ac965db9153d26fcee88b0000000071009a32fe676afc873684af4d80ecdcea9c14c67a530911dfe4f73ca376342a0c8cb5be84ac878803dd1105440c90b5f7c96cfda73915a41c2e4cbbd1053f91b810000000bac2f71441278d7f99995f0676b865a64bb2c32f43addd5747418e85de7391a02ea6b13ea686745e1880f445816b150492dc35441df2f556df23a261d3114d63bd0f00000000c40108ee008cd5280f955be05114c88de97964635d1c88a51ca535d09788039d16068eb52e220cb4db278c4cdca54505377a9d4e6d23bad5f78c5524b86ce8f2f447000000d0195856d02d276012d8197b633e65f9bf6fe979a23835f9f37c476d694418c84cbc9958961554b71f790752462f225ee6c17c49b0b7e951d98d4c3c81b2cc4d5e6e136a2b000000200e404863766ac2658217837f9a1badab449eed421d9050a207eb7ce38b03cbc88e15e240757fb030f1a236eecc976546f73d2ec7913e67b49c288895000000803800a90a03923cec22b559409d05cd4c9899e89f53498cd65361409cf697912f8338b0df995d9ab8bb930c2ecb7e0481b20c622500000074827f5004c91bade3c0c2c024c5f060999dcc0f79d6ab00a7639d6f3c6160da803000bbfb02592bbf8e240c8828f02a3f4643dc7e4fa3a846e653a2c5d08ca8bd000000d005484898be3090051606920e11ceef6f9a3fb7fc5a2764fd98da13451890fab8a0241aef078ac48fb1a205c4219ef529a78067df237de3858a30af039eba48220b0000009034440ea4ed102c4d9830d74e08036581c08489208070c2003b13b4d30f4cf21f1b132f5ae097bcbd5d0c5d18d8ea7f4400fb59cb27943800000000803800de88811a62fd7d917cb05349c55420b8f5fcfa84ea139c90db67829d3030cf7fbc33710419891618a5929434c1fe27d37e24844030a244010000a00bb0ac204da740926385ca043fef70322c31ce3786d9ea56f9f8f499085567944463edbf881a8a9541ff379d1d87c302c15a2337b29a7dd029a5090000005d80c881741d8310dc74d90928d600532b5a1506a6f98f17944463ed7fa4ce680c614066c17f42187013084c8008027daf000000008803e0c4dc849b299ff6c0381747e98de3d798e50e230c9080b0596140ca5b9cd11833cdb24467cc967ade02c1ace66910070000000071009c9c03312043cdd25ef528c9d8dc844b0e0676c240c8849860270c6491ca3bd92d4c3b2410485b788538000000008803d0a4139ce2b9da36cceffbf43c1d419c219b19ec3be31ed9015f0b03171185011109c75d4b489a683f247dd00de200000000200e406c07418cc75049086ffa364ba8eba4efa829f1f9f8f4998450dbae799fe6078ea77fbb97f2fb3da23030a5948322e5e913c5843800000000880360cd2ce0b9963d2da3b983d335a14a79090312defedaf2e3af9e7c789f516adec280d4d1b7914e8f301001155de71e5f451c00000000c401b026a421dfd7bdcbe5b9c83d104f183876a83b374f3ebc9f536adec2c038623b951c03334a399a40b0d032461c00000000c40108ee288830102aacf8a6afeb8bf5b996d4986848d99e587c4e049a29c5554b18c84cdce4832cf5888babf872429101000000e200d87011f05cd9001c5808ccc7a7cfe6c621cfc0930fef37949a9730504467c410061e451b8481f8e816ab379404000000200e40682601cfd5eb7dcc75cff15baa4c50614066b25f5a7efccd930fef57949ab730204e65ac59e4a9b60f6886b9e3fb9f5064000000803800550663c859c42138074b8bcf8ca95d56c2804b9e813bc396927590b5eaa791cefdeaaf7f3d47b46910a2070000000071004233096cb06e06506699c5678ea95a562c8dfd4cf6c5930fef0959f7e0875fdfca1af5cb48a7bfcddbfd9c526e8585c367e9930000000071009a13078680864edf5112f5f8f8f49938acb6790664db4242d6fd840197ed215d913c031794726b7dd1caa12f229a090000001007e0206701cf35a4105742a8eb09032e0e2bdb16fa0b03c791ebea7c20d14229b3a408000000007100ea3a0e234ac19b8c22f016065c1c56b62dace9bc9b78090865dbd205458c38000000008038d07d10071007da60e1e0b0ced8b6d00f4d36fa22e225669472fb68e486cd0e2a2c2b00000000c40168cc581c0dc820bf376c69e8ccc7a7cfa6c63e31def5930fef97949a973020d11931cbee0ddb162685cdbb262121000000200e4063c6e2c9c0ca0fe7c84d181819fbecea2c27a8c73c627b7c306c29991a19450000000088030088035d41f20c1c597e76cab6857e682e9198cb09161a390389c00e2a000000803800759944704c26032abfecc0ff8da85e5ff8f8f4d93cff716af9f1374f3ebc6737087f9611cf2d51032421ec5e7f040000008038008d3398a457156bae1107be080393fcc74bcb8fcbece79c52f343c5b9b38897206aa0bbe2007d1200000024cdf71441ef10e76448338b6fcc6e41842507e6f3b6854b87afb09ca01ecb88e7266aa0dbe2c00945040000008803d0b4383018fefad773b673ab76566d9d12594e9051647efcf0ebdb69640790a881b4fba24d5e07ee1001000000a0abb0aca07f1ce506ea05c5001f9f3e937a706ef971d916724ea9d52276f92d29e2e421620900000010072029a614c1e085819161394163341035702d33d39474f2641401000000200e800fb18cfd73dd4e0d868b0803b6db16be7af2e13d339ef59835f03e217d76b523c915712ded8ce2010000809421e7403fc501616e88201824ba6da16dc6fcdb271fdecf29357f748782d38897b8fbeb5fcfd95ab203e4ef29cbebc38df6ed991c447c00000000e200d810338cfb3237529762ac52cc83120664e786970e5f99526ab5891d358030d02d816042290000004017615941bbc40ee566dbb3e1b174f82ccb096aa2cb77ce137aa700000000005e200eb4cb26f2f94f73e7654e310f838f4f9f8918641bdece7282304c239f5f961420e00000000000e2409fd1b5a80f912ff352d74443bf850179c72f12726a1107c2c0920200000000401c18085903d758fdf0ebdb3145dd5b61e0d8b09ca071b44d9d44becc92920600000000c401c481501ca940704c71f792b98393ca728270c44e44f8c0920200000000401c401c088d388f190241bff8f8f4d9856139415b5cf4a46f0000000000401c681b9d19bc6be872a70804bd12065c9713bc613941187449c111e20000000000200e40489a4c3a2602c1861c04bd60e9e0a08a0035a7c882316de01a8803000000008038304027af49c4a19408820b8abe9be87282731767f6c987f7f7945c3062b71df20d0000000000e2c0d05027e0b60581e0f71f7e7d3be70d744e18f0594e90517261c8dbccc8c4dfa500610000000000100706caa2a5ebbecc9d1df210740b1106584ed01e9306ae9151cc0000000080383040fefad77371f81e5abafc99f9948780650689e3b19c60c67202c4010000000000c4816eb168f1dac53283055104c90a03aecb09ae9f7c78bfa2e43a290e6c286600000000401c18b638f0d0f23dbcc88ff50fbfbe9df03a92438401dbe504528fa61459581aca3720914488030000000080383054728740c2bfe709dc8a383fef7247684514411ab09c20199ad802f486620600000000c4010402891eb84be476c419955c0433de4cabc280eb72829b271fde2f29b9ce8a031b8a19000000001007409826742f12c6fefa875fdfb2d4a03d9686e504a9d0441b401c0000000000c401788c1ec8f21f5789ddd6a9f9b4d460a9ebaea1013c96132c9e7c788f73198f262207d614330000000034cdf71441b24828bf38864789ddd7a51c3ffcfaf69538a29a2701e20803aecb096e9f7c783fa7e4e2a0f9379a688fb42948b1fe8f745cbacffb7dfa1980feb67511c1e518958e4364fa5384ed4dde3f207003200e4068c4e9ce3b681107de257a8b2fc550947c04f9bd2e79635158383aa3e48688cbb8a1eb6c286a48c851986adf725afa1bc23040bfc400b13727f971e6718ab3adf3c98f1b150d328d860500c401082010643a43ff32d15b14c7f5ad262c9c310084e3e3d36732485f3a7ce5cd930fef29ffb88c1a6af78803908ad320d132bb444a71249609dff7d4a49b7b454495f2ccea468ffbb6675cf3726b7d0cc9cb6092481d927a3f6ef93666b1ea44291248da728ced79cff478995f4b7221ada4cff0b11355bc5850373bd1bff5b2cc110720b58631d744806709df66918f4094e229ce4d6d61c07539810cbc734aae1fe2004042ec5bda364d591cd0b69af29879bec7e8971f772a1e881395352c189c51e53f334ea03c826f25ada280d80b970d3ec791f9b22455eaf7dc31e2f498bad9a9fe2d647d9d30f1d83c2424ec8e8176db81fb94ceea4f51dc75c609fc9081db45c99f3ef9f09e10df668cc5d8dc52cc9010fb962a9d9198361a272a1ebcce8f3ff272bed744c017140dd470b28ea51e898dd6b030b0ab7e4bc4e9462302000ec138833800bbd0b59d53f36986b80bbcc80fe9f8e7bc3d377439c10b87afdc3cf9f07e45c93542138217220fa4e24c8851767ae023293bab1bf369cdf35d0f5e4531ebfabb3a54f388e2bb94595b02e5ad5e3f15d62ddecf9d5efb3e505bbed036e1220a5ce7872c6bfd79cff14a3fe36b978a48606b23deb75c376f12ab9b45ffd6159f0071a0637cf7f7df7f530add31d64465cd4c7a3b18540d72b26e0e07d64e1c585718e465646018b7bd75617ecf32c087ce8bf12ab59d17c4303771d6667e6584b0c60e12a9efb2c6f790507997d7d551879e47c64f71aae5e7ac81b61c93c7a56479f92f229759515ef29ea7264c28f395da31d29faebb94d85297784a995c9830bb498983b7325fb2fc6f5a68c7dbf54a3eef947054cb656adc23126ef3eb8c3d9f6b64beeca440ddfcd2bf5d68791cd5a893598d5b29eea3ecdcd7e96baff3f740d414e200f45020283a9c195bdc0475b29370a007240e34d159220e402af5fdde629cf9a9ab7dba26dfabeb50dc168e84f936d160d9502e1cecd3d0fd856930cf8f261f7e5de314cffbb2bb51005bec2a2f8b69e47b5c3a38ec6fcc27c1e9bec6f5462a2e9cdb7e27bfde77d4cde0effd58fb221fa7fc558cad6ab56e489b9918b72498d8448803d07381e07140549180f0e9af1d6ce938ff74f8ca5dee3c8f3a2a6a200e1c30d0f2b6c19694d0765d17e3edf7141c9c88cfe8dae7164828f5c233eb7a79d6f93cd0a3c86cef455349bb6a4450f5cec8779c95dfe69f31ed20076140eacf346474a766d37fdb7439d4a89bbd9b9d767c07d1c5811df7277d815ca752a00d2520813de41ce8203a533331dd5c6f248315f908be65e9f8f92945d6b823d10488669002b6fd4b670d6a9d6df7c949b0f675c4c50992d94975447e349fd66dd71dc76592e09d3a034db06af87b29e3fb4c379185818583303009bdec5367e07fb2acdb63ea665275b3a9fe3753b1f037865bc4014020288c99979a5c69f06b893e3e7d26469d4b78ebf5930fef335a41a38c280218022a84d9ce6a1f75bc0f6f6d498488133a4327e57d1de0946f75362ed532ebdd92c21ad11a59c4f62bedd1369a611a6b59909eb7e9be61d3f0f752ae9b223edd76e03e17550201bb5a200e807be73b32ddddfe4cc2bf24037336d46db13e3e7d2661a62e49a5440c22ec1c0062e16ad04f1107ea19f11a49f03cc0e9560d8ca5be8e14515191d1652b4bcb8fbf899d285ac593aa99e15102edb9afb9b03ad1e6542038b41b045ba3230e80ab61613e45105c75f83164d6fc4f09858bb84553aac840ee923b62def6ee0400d06b5cc5c7f301f6db31c672190b6c43b1f77164dc97a835f57c7d75c07c2667b248f7b2b0b4276439cd3c11c76f9440ddecab70d5a5e79a1b401c80b01d9b26857a6ebabdefa984c2ad87b2d4e0e3d36713e396944a92102ea8f10010030d4bf749e8c55653e11ce849cdd39cc51c439b4a7c8803e6dc76c5c9b6dd9960deb0434cb4633b744690d37e659fd036e255220e807fe35aaa6171dbe1c728961aac06b0d460e9f8f929b5bc35189c6008f8f6315d35fe9373745520a89ba40b117978cc2d3f271348ab16eaf45503d7c9a806bdb489b1bf1007a06e279c1f92bce355c71f4566d4d7ba776defd0edff5c66e84842883800100d5d1a70e9f9f5d3a1e68d89348e578562577142b2dfc1b55ddbf7bd6a298c3e55c7ef8e1a940c2b8a007100e21a17e27cfe58d3c0681b593bf75a1316f6664debc7a7cf64307ce9f015921002406cea3a93538a302853de0738b45ddbdc45594b36a95cf73641716043f549c66f91778158833800b11b9aee23fa4bc71b9c242cecd3b6874bc7cf2f4842080091a92b40e28c863794eb846293287258e2802d6dae435ff2aaa0828c22401c80668c0c09231b996e272c1455fcf7aeef68f0f1e93319c4cf1cbe224908e7d4e2c130a208a069741fe9d39aa739d18486108eba7d3fef631858bfe796778d206c1c1007100720319160a9cec7ab0e8b04b2a341d6c5f5ad1f9f3e73d983b8604acd451c00884ca8654bf45761c7ec8da99760784c29f61bb5858e3a549f091b8743ac2902c40168be73bed77c0432a05c75f43164866bddc159aab9e3207e4312420088ec5cec4b66e693af862478e159d6f8ee84e2eb3da38edd2f360d1cf25110071007a06591606a3e252dbceee0238893fd2e376ca75db8d98f4f9fc90cce0bc7af4da9a9c9b0a108a0a7ec4b6626d104aeb3d6475de99307e24ca5e238def01aa331411c809e71439d411c80764502495a28c6e1cf1d1dc0df4a1e820edca7eb3dbe2109e120c501128841d3ec72e6ef740667e9713ea207c28ed1f21e7c97019e50829018cc0c03750471003a6280641dded9e0c50fbfbe5da67a731f9f3e13e3db2509a11882736ae52039a508a02974bdf2aebea910337dfa55b2e4632c43ba6dbed53c14848d83657f277e8844354b8eb40d45823800ed76dc5dddd9e0324581409310ba460dcc9f7c787f4f6d0480c8ec4b44b8d2f1e0def82d3b9b52b46988036d3b83901c9304ee41f25ddde8815800db7ec852fc10896a961c699ac81210072085c669bab7b3418a02c1dcb8252194ad0b17d4c0e1c2ac2b34c82e27fe7acb185b053a2ff853472ca63f81a4c401c9772591aa7acc7825008803d01d81a0bcb3415744021108e629dcc8c7a7cfa4dc48428871ee0a337d101d4d1cb84bb85cedf8b76bdf7fdac5ed66136643114020ce699b008038004313095e2692317be9f879b62e4cb70d10fa087d6357e2c0078d1afbaaff377ed103cc08a6210eb0440db699530400803800431309deb6b9d6f2e3d36762789f397e0d631a8409450031d199c3f31dffb54f04f01107d8b5208d711b61b3dff8bcdf4b72510000e2000c512458b5b87edb356fc0d5930fef31e2d2a6a97ace1a6188cdd4a5df9244b5c67d179b93bcff452018469f05edb1f1fcde92a20300c401882d12a4c6491b03e0c7a7cfe6c66d7f69b62eec064d8937cce8401be2c05dc52c33d103f459909e1de6fb8e4f53de021a001007a01f22c18fc66fdbab989c37397ba549085d97072c9e7c78bfa1268132a2082016da1fee122fab1c051f47e282dd3782e02b18220e0c035fbbeb12810000100720a648b0917d49f35f7f31ee21a831593668a0ce8ddbd6851235c0d685dd206be83a27143544e4c2c7f9d719ca5bc76b1d19a20742e03b7e65141d6313020100200e40db2281849fca4cc79b446ee9a80907fce3d3671319681dbf265103649386af20591444aa57c77bfaa81b11772d4ee1e344200ed467e4f19d071d8ba1ffd47dcf8f0201513e00803800310502596a20e1f53f9b34a2082e1bd8db77eef8f9bb271fdecfa92d9d216bf05a88031083694da7dfc709615ff576c4018481e1d85b1b537f49a78886196d159a4084a8fc98940eea1de2000c68d0cad4d1b94ae07696b14eecb97521c240b7d824ee0c0054b12b1fca83ad23a94ec88dc775891ea8c799c777185f864588e8c8d3fc58e78eda94e28406c6a277a5833a873800031308248a401afe73d3eed64a6711d549d78159a20696d48e4ed5e326c58109250e2191d919b33b9fc54afa688753f9f45b187efeefcd278ae8aae1fe0ada1f9f32e327dc6d23cb30dfe6f56ec532038808750b7100e071f05aaad373dbe26dcc439ff0e3d36733e39e446e4e8de8244dd55d96154068a6819c7d9f70f553f26878e31375c1f8324c42bef7f3fcd8104500d838880300b10582b50a04372dddc2654835fce3d367c71e03f22d51039da5a9adc18e588307a1d03e6f979379a7338e2e7db84419f82c13c3c9f0c3b5dc5e11353058fb2a3361977016510419e21e0486c801c40180af8dcbfc9898f6f21084345267c66debc2e23b803850c584e286405cece9a7969ee7f3891e401c70e4c052907ddce663eb9c921b34625f845ebe29392ffec8ebe382a5061088538a007100609748306d49200862a47e7cfa6c94ff78e9f8b59b271fde67bc7dc401c40168d86130a1c401dd22cfd5019168181213c61babe47d50bed855f711ebc10bc35203a8095128880300290a04a78142b6e70d7d07d2a9af19e20074d010db354b735333fcdc4758c079b57f6fd2fe2f5dca96e504501aa75e453a7db1d460ad7514c015c481c4f99e22801404827c90318e86505dc448f5defa47a3067cee779e7fb76faf7014e19cd3bc9c9a343c164f3ebcb70d95be35cd84c49d888885c10f35091a35b0f5fd178edf919c2f33c7dd1186cadce1b3cf1b162e217dbb6aae9320b1ec2a1903dfe5d790c91dda3438d9771401e200408a02412d71a0c677cf78db768eb171df01a20eb28ed2561cc84c73ebe526019c381836bb66eb1f8c5fde80729f2d3387771eedf4823a7d98bc5ce70e63c573dd090860975d358a6c7788cd76217536bfde8252878abe6d861d9c3e2c2b8094904ea3a9ade2bc3b279dd13ee775f58a53874885acc1fb9af06aa086213635bb1311ae02cdf4f938a553deccc17726e2896d2e1b8401a842ea53eca59bd2c7bc66a9011ce8d7c6f92182f46b4a237d881c806410635507968d71df01c0a7b39a788662ce795bbd6466e9f837290eb0461bea300de8d4ef3b8f6b52d63396cbec37a02ddf8d447e4c746b6080837695f4030d4566164b0dde889dc452834e32d1c8a520e7d29fe3266c7a401c807e0b04e210bd6be0726357474f67970989ea1f8fc68c431dbd69a81e1cd510b160d88ee6684f1dbd0b559fc4c1cfafe39383a3eeb2ae3ebeafa9964995112d7dcf058e1738b6551108444c6a62e6f6850a1253ddd904bac319362eb0ac00521cc43275d69a10075c99f3867a8518da3f3ef9f07e961f2ec67693060fd103e0c3aca1babb08786f431506a40cdf5a0803aff2f1718230009eb695d4b39ff2e3ae81cb495dfe5d42c9f3e398d207401c80c386c0b1cc8e8b41a06bb47038773be1b107b091cb87891ae81552b77e79f2e1fd243f361edfcf100720712e023af387f0111b4ed8ebfa537e81fc90fea76ad70789cef84932d053ada1a64020d103d2f6de347449c9cf442e02800ec1b28286c400f369ed4d716c8760320bf0ed0076af594d7f8f781957471fc3acfbc85a5dd9b6705eb37efa666af7e1d191627d71e7c70171cae51dae63bf4b5d9ab5ab6ede865eebaf7df5b5714fd22afdfb74a0f6c0853e7fd5720ce9af66241d84d06d56ea95f6494b137fd243fa22c945f01b3b1a248fd83521c68863d3dcae4e8038d049c4083894b4694411ed1cc0560daeed3ec8c7a7cfa4a31bf3563acde37ecc8ecb070e2133a62f1abaf7a92114bbcb0ee1b85c57f27f3fa85090c91121a7c43ea73b9661bef410072e06f6fec7facc1353bd7ce041dfd582250410d1c6122770a2b3fa4b135fec7ead42f794d24f9665e80825ad5f63b5614e2862c401b04366068f310276229d54b4e484b6c9dec4a1d465059921eb6ad71081699ebfc3d00ed81271002cd97e77d28714899f4438fe2e609f363ae0a847c995a142ee8363df28c9362f3a98b06cea1022ed3b7b76cf120268502490b171a4d19af3c836cea5f65124d51c56fdcaf2f72e3693889e97944ada9073201d9895dedfa9dca4702fb97329337d62143ef0663a81bca7e79a57208b5037a53edc36f42c471a2a0edda4c97737ddf3f7abc8c6f82ae0bda68ccc7c9d591ebe61b527ba7b014093f696386ee2b85f45bed4993a8b242a1c56fd7a5cce629a498809352072201dc4e9cc28869d2c4d22890045202082a013bc329f720bdc3750375f37f44c53d3ec2e09100075f20ef5153711eac95ee75d43dc0ba37c64be5dd636d9f1dd8dd9bd0eb518b3eeb52db8ce089d1335b797b9962940d30edc54f3112c22da5ea7da274d28f561d52fad5baf290dc401a886c881fd9dc9523b9318ceb8b3728d40903492186de6b90341eae2803852a3d009e5203a8d450d68b8fbbe359db2ad98efa9f739082f03950f4ef0b79ce83ef1940db461773d464a6a9f328f24129c49a83939080607c995110700712008a2305f462a77e7d9d8924040e6dd4f338fa193ccf864cc8d9157a0ca801215fcca34b7866e66c83dd0192ad6ffc73094ba6864cf3a260e48a44776a02f1c158e4f806bcd0dc209b42b1264259140ec9dd019e8250741860836ac3a5543a806c4814171c2ac602be28037a51c0483e6e3d36762c0be0c7cda65dded061ba4c9043b12ee39270cbb33d838eb41dea5aedfed62a2a7d38e8d7d996db2405dc231abf15e881e80944482b12e930a1dc9b9508100fb773834b51534784042c266b0edf02614d57e838c2280448d2611899a4a9a2906198909fb250eac1bbc5697cba9937d83864cff6cfc13d9ce694690509d5e9a4fd1316f028f6b4461e21701e2008d600718fdfb0724995dbba5242051e63dbd167852b1febf4ca8281017075b1cd51b3d5e958ee7eac86e1fbf6c7deeaaf47dc481eaf12babf18cec5c00c9d963f93133f544af6dce1db60805c4018808cb0ad2828ef13032c3167abd1b1d140431fe73c3a6a93039428dbb81ad43573b7240c3d7f7f58dc51a79b9cebd3aaa3eac0e5c5f96348cf518e9b31f39d6e9b146e1f4b58f58e5cf28b3ad2f3cbe3e37e41e8034c7bd91f60da1726c6007230e00e2009490bdcc27358c373a133a28680f316cde36782d9c85447159ff1f287fc4be24950ff9f9a31bdbfa0c991ef2fcf2ef971ecf301d401f211182ae22228220a42a10485b9fe88e522f6a9eeeacef22217c665b6cc6ef4908961534d379ba547a9616ec87ce03526ee762b837957b8050e3b4b17d37b5eb8b0a111796065853f838b11703e823ee8dbf0032a75941c2755bc4bde7014ec56e3cc3a82f928f655e3ab0ef110700712019c8fa0e2169d2805fa86308e9616be06e028d19472989039a75dc3547ccd110042f3582af3dbe8a2008a9d7ed650081001b1800716030dc391800638aabb1c18cf035086df837b97301b32c8991f7df2e61e321c4817d75e04ed6b9b758144b1c03e77756c59c16063d17088e484c08803830145c8cc029c5d5080f140144a0c9f6fb52134241371dbfacce85f4ddef4b44b86ab91c7cae7f3e8468188dac78e5f155a207a02b02c1558d53200e00200e0c0297f07506ff66206a005232fc7d5952ea69a0515f2e59bb37352f394bb55e683bf0099f1fcaf82709dc7c04ea392d0d3a300e4a3bf6dd7e1a710000710047748b2366071007a0d3869118f0770d5dee4c43d9a17d5ca2061ed481aec3be71e22e912553ab80cfd4b73ee2ded3d1277a003e23d1430987e1fbd6d3116f1600716008b81a810cfe8803d06d9a6cc34b9213b66fa41bcbed0b43f43fea2026958830d07d9c0e65a9cc5fff7a2ed1033e22e29cf63ee8bee6223fa4cf17bbf24f9368f4980a945ecb6778cb0088038803df72c65ae2e864140144348ca47ebd69e8724786e5056d336fb8ff991ef8bf65226d4066c77d9616cca83795ce13c948878bbcfbcb92139db233edb57c86c4dc00880343c06796684eb17dc524e0b9ee0284f40254394762c4dd36743949e686c3d0026ac85e3a7e6d5de37a23b33fb7c16d62bbb0f8440f5c0ca88f581abfe88119d10350ea132689d6ef7bcf3e80ba0d8038d07b03e0dee36b97440f2465b002f83035cded8c3167c6a515161edfc96ad6a97d2c13747e5debffc9c0b6339b7b7c87ad4ca14ccafdfe82d703803800bbf1d9ff7c4eb17d26a4b198519cd09073b46ed0887f5c5ec08c62736832c833c7afdd790ac636e2408ac22789090ff7114b43f400a4631fc51803ef784500dde07b8aa051361e46a4440fcc09817f2494322e59c2891c80468d7f9dd17fd1c0e564df7b7136d8c120be30208e59a351032a46ec5b637c9be85821fdadebb20b49ba765c5344e912f3fc78ebf89d23ad7f535aa3777b9a695f99a98db6ea689d4b3d622cf3e803865e37a54f981475534544da6ba9bd5226712072a0597cd7812ee8101e97571c053a1d9d09b42110c8a076d3d0e524ff00a19cf19919bf6460598d6b4ebbd6b7a918ebbab4e0c8907bc006961fd643da934cdabccc8fb71d1106363bfe7692f892b20d55ad5edda4382813c401c4816d437f32f0b20bf9fc384dd016e2ec3495a0f005fba1c7430df1979e5fcf3caf29910ae75d13076adcdbd0a25fe60d962d6df8537b3aede0ad6f1ab093429351e39ceae6c8b0a5635fda2be20044110718fcc31989372cd180b6d0592931e09a4a50f81681209a91e2bb34a9ce4e2987dee575e2b39e3e63d8f99066c56b440f9c3181e045df92b7f6a9af5f5337610bfa38c481de3a06be49594e74fdd1500df1f340a79b53130181006a22d147beb33a75f29dcc229db7897aef9b948ce8013b9634cbdacec64347ee7b9fe37cda17316d40b9466cebe60dcdb5b3ed1571002ac96a7cf7e540b7290b1935905105211147a9498160814010062dc73a89b532cfeb4a7d39e9aa3850e31ea703eb1bc4c9f71151063b8110d0b6e8ca6cf57dcfdbcb2d559359728b3259532488037da16e655e0d70eba25962e781f8f4be8e372c104872372208ea0b03f2beea2641ca3cbf77e8dd5d7764a66de9f19dd3018ae2be4efe8ce484d66db9cbeb97d73d1707d603af9ba31d7573437b25df00e2407fc96a7e5f668e1603ea1026813a8437ea8c41371cf94138032d44102010f8f7455227ebcece7b39f16a181d8a565875a8befbcc0a0eaaced6881e383224dcb5e522827dd654fd38d4879c24dac7bb8ce9d9c0ebe664c7df36b457ea09e240bf9d81ba5cea5e9f43601ee01c0f865c03a90cfab0bb4f1899e64229dfb2cda197309099fadba9fa3af18796563d746cafe765e0e767ecfb1a49e27841abed7d9d3ab4063d457160d4403fd9e7ba89380088033d27446291d77d9f015403e72cc0a9a624b7e91ca3213d6c294961534987649bc36c804b94da14068cf19fe9e86c22c240f77b323487b746f480b0a06d1f6cd3fb921c671d7a8c43cee25982edc57612e17ac8f69a2e2938471cb02a93cc00e2408f0865ccbdedeb5a4c1dbc43cc6eca728215552e2a6711ce39b8fd7dc520ca0f1108ae1a7c6feb8126396d4318b8f5d9c250efe1b42fe28096814f940cd1036efde79c16bc979987c3dd2571c098849697a83d676b270cdd5e9beef9fb9a32e9747b451c804ab290e7eaa9715f67abb0b2314e12c2887c7cfa6c1cf1dc932196695e6765207c6e9ac943206dec0fb29cef3468e53dfc1148181096811d19e1a1a3e2a78fe37299c86cf8a8c1be40ea8c6ff4c00b9617ec7554a77bcabb4bce46951d99d2ee15b6f5f0ae634ba462d4cdd99e72b9a74c3add5e1107a072c05f0734fc8f542098f6cc28bfac791a29df09b52d3a31cbf862c07dc452cbb6a93c04b24d2a51046a8ce48794ffdbc0a75ef9dc4b453bc83a5accab44fa041fb161d47059d519db972c2ff8067134764d3c746d1f799b99e454b6bfb6adc373eae64e317ac84ef07c4f99dc18401ce82121677b7ab34d990e64758df24761803c038d0d668803710482622783370d5d5242d7258a60b0eb954bcb082e039ffac67396e3c21c8e5c5875b46e4bdf7cddb0a3bc8b7107ca2af32cabc2366059ddd7edfb650d673bb536641355d2eaf6d7bae394cd9282dbba51037aad3ed6cd6ca0ed55dee78b3eb457c40168431c2878ab335e5d37cc430803741c91f9f8f499d4b598b9014ef26b0c7a5988e6219032f8d9f88717bb2283f166485b1e6ab48084bacb3282187b29fbf6cbf38affefb2d1e833069e6972aaa13135fed18667217737eaaa03a60ef2a176e86b33b429a4dab4ff13d3ae403477a8e38344ebe62a423f3fee70998c239509200e244dac8a7dd9c5f0e04089bf10069a11058e5518b86ce072aff36b4d875ee63a7b286da4a92882221a6933805d51e4f93666ff0c452b8eb03a6187c4b7bb8eafb9f47558e62ddff7710bedffbea6f3f4bacbb3aa819c2fe9434f23d8643e6262a877617bcf676d4c1ca928651335f0db50edb652dd3cd4d77751b88aed0f60e7230ef4d2d8f70dabb41dac3a93644c8d738481f44581717eccd591ba6cf0d26f458cc88fd1d0fb8c52144153b9084e4a22c1ac4fcb0da4df91e7329f96311d45bcd495e712a7aafe7bddf5faec39065e068c1ef011d14f5b2a2f1153ea8883ab409306a38eb5f3b1b69543efedce732791b6fbc3ccb1dd34b6c440cbddc60695fe71d1627b6eb36e4ed49e3a54376f6b2c91eddc78ad8252953f70473242c4813eb38c7cfe976ad44f12ed04ca89bfea18e7b7080341458091ec142021fd2206e447961f323849c8f5cbc88ed45ec3263ffeccef63a5f735d8c4791245901ff2fc4ded68508804afcda7e506cbae262e14a75244d3fcb8d77ea7892d337da20624d7c0d900aab36f9fddaa33d1d6d20615076be51f08e01c8e3bd2d6cb4b85aada79d670594c02d5878d71138a65aff8e83b5c3944825ee9ee3ca6cdf6dca2edfbcea28c32df6b9896844c5fa1243f32b5338e22b557b0e4bbbffffe9b5268b741dc37e46c4966cfb98627a7f0dc1726cc768562284d493ee82502888172ac03ea587fef9a4372a30ec67d31603cf9f03e1b50ff516cf33333cd8b3677eaf82e5316e64a19ffa72dd46f99e11839deafad612de53fee6adfa7ef655d630c785e2781993af87f7a7efdb780b39d3ee596d530fcc599bcf09d79d3689b138f6bce9ab03fb4fdcc4c7532cfda7549c507dfe548ff0cd17675a6f5b5e3d71ed41e5c44287f29f7650bc2409dba396d620c2bd54d97c8cb5f7cb6abd5885c9fe4de62532f1a6aaba3d2d8ecd29f3d1ff296978803c330eeeb0c2ebe86815c73d58651a9510cf340467a6b065a870581a996ffc9001ef771d07ff2e17def234a5a1609ca4281181459db0eabf63313353cda9c3d799597c53c82615d36e4665d0ab12c1984b300fd9053f96eb597558d71489cab715be51ee8fe2f5c1d004f4774575fb1d1be62a3c7dab7cfd0b63ed2f63ef1ac533fbabecb0079928238c73545ae3b15099681eae4dcd29e7da35130a9d9d2b7457d0c58378bc917dfbae92c2205105e7795c7e3244c1dd1a0d4568bf2f01d9b7f645901e240df8dfa3a1d7b1d1ed4b858f9a8921e1d55c899bbc694de1e8a033278bf1cd023ff4c24416bc2ccba7cc4100cf4790be3ab303a52897ea97420b5ff2f1c9b694d634ea268ee4319b681de4ff9dd1486f25184725e951ccefb5d634369795d88b22eaebb2caed946596b68f265cd3af3f80cbbeaa9bebfa28d35b1d4a5100e0a8aa83063be44b71584ba17abe89e525b2deaf265a0e72dea90f175bc341cfbace67d78458169b9ccb44d1d59b49969089b33b1ba39d9fa6ca87bb9d52584b6e3e071a97f8b3dfedf947e2fc61d537a2731cac3babd02e2401f0c7ae958e72d1bf3d7dab8b310e1443a604cb4d33e0f68042e7c668a00716080fdca548db694d61d1606c5e680a15566db21288cf394d753de6a3fb53cf06e9a8e18bbc9ef67d260dd6bfaf976f1ffe4c77f4bb50e042c6bd7689343dc6b997d3fa0ae72e72cb6d6e1494bfdcc83f689331b675dedad652027ec41c58af58e7ebadc2f8f1ccbc77b09a80a010b13475c4c999d9151898eedadb65708cbf71441fb4868bc64915581e0b2a5db38d7439218cabf0b95b430dacbcae03665d5721ca903ef5cf82c40cbfd8a188b4b9d311563e2c2b46f589d6dfdec0bc5ccdbc2b28f1ab754ee4d914262b0ffd6e2b54f4d4359fd6516569d43b11fea0a32c766786407ea705bced791b6d963cb3a207dce24d0b2cda3923d188210f9aeba980f2904fb222c460315060eb557401ce8a5212f9dfb54b71f5c26d0119ee8d1f67d24954811a0837d8bb49dacb4bc276434cf90e944424618441b17f17ea6b3dd531366d9c450ca6ed5a367c9028a04d86eedf2c0b8d2eff68a3800ae22c1a434db7739d0a260600108ef402ccda7680284023f248249faa455cd28a6be1b7d6d3fdfff9e1fff9b71dbe62d349b16daf8469dc2b9461314917cc2c4e214c56ce4ff9d1fffd700daf33af1367aef590f0a9140ea40b173431362916b04954b39dc0c6cacc92afa96a195c710c6cd6420e740e238267be93a4562a939cb07001aeb630aa16062fc332af7951bf36507868ce200808ef6f3e3521f3f0ed4cf17f909e45861b701200e40f39dfbd4f473a6afd5ed150120ba11d90564d6abd85d01310000fadccf1739a246e64b92d743b942367a14f9a7d6d86b008803904ea73e325f4282bb9aa4450481a5416d06e8427f53deabb90f19a3cbfb376718ba0000000088037d30dc8b7d4d8b23d50ca677e6ebf0330c71806e0b0623ed73ca3350294519143bae6c4a42c086244f00000000880343120bca337c6d8405177bf466e64bf8d986b70330a83ec898af93a04db63eea2a2614ce7e41797bd5f2ef440100000000200ec001837db265a08bf17e5cfadd254cb86ca46fb60e0c73000000000000c40100000000000000e812ffa00800000000000000860de200000000000000c0c0411c00000000000000183888030000000000000003e77b8a00203cfff53fffbdd8ceadbcaddbde1d22feed7ffcc7773d7af689fe3aa97aee9c9ff367cfa831d43f00000000401c00e8ba23268ed685f9b46fbb1c67037aee893a9a83796eea1f00000000200e00c02e160375c8927eee520483e97974c250eb9f6d3d18994fa289709fd78535a50200904c1f5d8e6adbe47df4865201401c00e832f7037dee2c35a754c3e9e7f93135a5b0f9fcef0fea442f72c3e39e2a3b1883f31be124fffb5dfe6396d78315a50400d05a1f7da17df4c9d6df6fb48f46c8056801121202d44706b757f9f1b31ebfe4c7ed40c48157fabcc573dfb42c0cc83dbd305fe73530faef97f2fffab93e311f68fd3b54172666bf782586e8eff967a6745d0000adf4d1d2fffebe2d0c28d26fff411f0dd00edffdfdf7df9402401c4775bd67e0fb869e252494e73eb5fc78b08484f9756526f8dce2a36ff26bcea87fbdad7ff2ec1bf3ad4014b5fe0144a8cb13f329af4b39b1e8a8d4aeefb4ae1bfdb9d176bf26341b12afd7ef2c3e2a117f63ea3240b3b0aca0ddceb12d58d31519095dcfdff13cfff5ed001f5f9efbf786dbd3d85218105ee49f5ff4b90d50ffac8481e2b3130390865d2022c0d47c4a306ab364eba42414ec5a3e93e5c78a253490601f6dc391f9b24c100010077acfbb362f9e1b0ee57f4a28b8acc35e1b661d42920df1a1c510ddaa5f4d70e1f1f905f5af97b8d485334958487f072d8fc72375822e039ef644cf77a9395744209853d7a1e5ba2e02984baea20b4a0da059c83900463b6a99759535d932e3fb67de816f6476556764c1cf491623ec61a08fdf74ee8189e3e78fa97fbde5c4f1f3237a2b68cb51ca8fa58cb98185816d8ef4fc32b62f28796891b147dd0500c48141f0461d2839ee1235b025b1db1f2a144c79655e906d17a87f00b02d0cc88ce8c6421490e4a2e584a33f957eff2d3fae1c6d881788fe0000b00f9615b4c4ae84683a60cf8dfddae97d3c949c0299213dad793e110adeea1a66b600031b32d3ec36876b93d8b68ad01ad2ffb9cc36b1b525342d0cc8ecfd8b8a8fd96ce79695ce3951fbc1a61f1c1984436807fa5b00c40170100c64b0bec8077917c74a660c96c62257808a0f724cf4700dbf2db600bbce7f4ed92f1ea735b17276211b48b96c0658ffe4ddda0aac0feca50d0d0b03325e1f8a1678505160e9683f48bd9f6844827cf79040267600223fb462e76ab24c5bfbf39a520368169615a4898b51b0cc3b5b4932b4aa4a34249db2181cf9218efdc87c0a4bbcf2b83f31bcfbb85f7c0c10509a3138a4cdd886d6de0e68fbbacd00abc322d26701ea0a03330b6160e22a0c6cf585e2f44fcce17c238cddd0151b973e1a0071009a32e8c54112a120fff547e39e40ee14810012636af19907c3b648bd46851f1bd15344a23925060d0903e2b0bfaeeac34244b2e8390e0904e41c8036fb68e9776f2d3e7a3520211f0071002a8ddb26afb7c90f31247ef3110878639050bbf9e580415cccca1146deffba30359f92beeee3c6b8ef7001508765c5ffbf0999cf47fbb929c50e8922fdef75457ba0fe02200e40cb06b5846f3d771508345121400a75588ceb91f924745dab1378adf57a843030a8ba2021dc3f9aaf77869188829f450c25670a34852e2738b4c65a84cb798436b032cd6f2b0b605337eff343f263fcbcd547cbef3fed4ada0d00cd404242d8eeb097ba54e0b5c3d75e4a92a5aa9c07004d191de6d33a45d62a5217a44fc2c884b6a9aa83ab8862d5343ffedcfa1bcb0a20953e3a3344a00224059103b0abb316a7ca3543ec9c92030000f882ee1e5095997d19713cdf986fa3078e783300008038002eb8ceb65de646d08862030000f8cc8585039f45be8725af0100006c401c807dc6cac6b86f737841c9010000588f8b4de40458f11a0000c006c4013884eb9a6dc401000000f3b8a460641208e1d77c0624260400804a1007e090412199ddef1cbe7246a90100003c324ae85e325e0700005481380055388523fed7fffcf7094506000090d4ae0019af030000aa401c802a5cf7851f5164000000e638a131f3abb15cb72c060000f80ac401a862e3f8f9114506000060c549138ebae61d902d8a6ff460ac0600806ff89e22800a8322cb0d170a020000200e92cc77d9c0784ed26000003808910300000000ed31a30800002005100700000000c2b3b1fcdce97ffdcf7f67561f00005a876505900cb97124999d4746333cffdbfff88f794bf731d17b9075a0992cad48a47c8ef5be4666f77a5159532a49a7d6babe14be2dbb89fea991f7ba5da77720f7b0c9ef65d3b1f29c68fb181f708a36a9b49db6fb19ddef7e5c2aafa5cb3bb7ac47f7bafd6cea6db0b2dea4fe2c11c481c73a21f564087d77aafd62a98e16f57455550ff53b93ad67d9e818b331e03bbe7cb673dab205eb8c7d6dda613ade8c4af6ce366b6d5feb96ee6fbb9d75c67e401c0068a6939d9406d6a3ad8f3465b497efe1748fa1d256195d94eeefd4e17b777adf991a38f703ab5be3adf77ad2c47bd541ef428f738bafbcdc7a5fcb441dea51e9b9ce1cbe273f6ecda7f5d4ab368ce5ad7e66d7bdcf235f7357df961d721c6bd4a307f369fb5929eb55cb75a6709a8a3eecc4f1fbf2e3ae70b4ba68303ae6ec39d2e71c9b9ee1d17f34d22f96eae8a131767de099e6fa4c477b3e230920173839b5dfc1bcc5fb93f63875b5c14afd7156ea93ef2396e145a9af3d72bdbffcde960d8cc3c53d9e587e477edc68f92d99f4421c80ee726f61204c5c3ab0889d947367dfa02135d301c9b78ca4f3bdd463919f73a546caba8f95ae24f25cb451b74a86e265ddf7a506f13cf660edd056e62e82c00ea48dbd96233fdf95d4ed9883bc1a731707c48058d72cfab5f300f5e8c2b30e1fb55d8fb42c66359e61bb5d9c94df6349705a9b2f9152293b5fd70e7542961788113ced49bf3cd1ba705ee3fd17f5f956fb8eace63d95ed90aafb9aec39c74cdb6955fd96f39fe79f1707672ae268fe7b1375756611f110e33ea42dce2ceb45ea36d8548f931aa73a2aea40c90e9b8712c9038d17451d9dab8db8085c9653bd47df723cd3a3b01fe644e4200e401a9da4d3e0b0c3509cb63908f8aaaa1d34a46c1c86cf464a0feae6b8f45e4f5bbc0f5b43d1c5207eabe79db621e868d92e2238d7520f2fc4600839b3ad11365e33d435af5918b92735cf75ac75e845c05b2cead185d6a3fbc8e52163c5b22141e6548fcb0e08062bc73efdb2109bba3a5316a9ff90f7fd4e67e39dea73491098d6192bb49dae3c9e4b3eff67fefd570db58f63cb7bc206dbed6c5f4638fd5169fc9bd5116d238e17afd599af6d7744ea038af25ba4b4d404710086889338501864d2784318cd013aa77904673bc6bdae1abacfcf464a573b577576166dd62d4743b1088ddd94da948d132b466c1141d2e47349bd7819f1126224fd9e5fe779dd59ed06dbcd76f9cc4219b85a9f97110d66291f096f9f440c6b75ad33e2c897ef651ce0f9770906375b82411b91535247df7a3c4ba6225aa7a2bd2ceac283f97a1261e4d8974b7d5e4bbbb1981d9f987a82fbd996e3b832f584e8c1259dd40885b38ed4db60fd7ac5f837359e5b975a8e1737fbeab143dfe32d60a8c0b0b028cb1bf3f5f2ce89c5bdca395faa40c03203c401680997f58f375bdf3b69f9de8fbb200c940c9e267959ccb676308a6064d21006b20a43518ce0f9be303dcb70bb4962cf141299d5beaf194170dcc2eb0fe1c816652e75e34503f77caa8ecd24429db19d49bdd3fabe73ed6d693942c859bbb3d2bddd34d99e0ae459351cf6d2e39dfd917ff7b7d0a1be2df51f7bd7df976696abfac38213f345f05a578c15e7019e6daccf56b7dd4b9fbf31d56bec5d28043039af75c44cfeb9ef4a89ffc6a5c3f519efcc9735f5d9218125d17a3b5667bbc9e8c3ccf35e9707fa915b6d5fcb03a2c2ccf27d1ce9f86c5c0502b56bde5ad4d99d11ac0ed11b13ad77803800898b03e54ee47e876810cca8b664b335806dd499384dbccc0b355506fcfb52344639d377b1c6b98e932ce5b0b630b05263bda36e356d84541913220c1c2c5719748b5c100706c213319c1b08093f64fc16c69ffcffe70cc7a5accd13e31f25543743fb46df7b79367264e28a476b7538cad774ed578ef3e75eeff8cec35659672583a9388af276ed4bcf64762c54c490a3985419a9a4f56aaa337875676853c3c6d8ddc7ebd2d2904dc20ed6befe43eaf4c521a755dbff52fb03db655a472a101cea3fb6a3368a88156b5b44ebf93280edf2aa341eac0ac746fbd195e3f9a54c677523aff60835231531aa66d12bdf6b698c3e2bd9604df4d1b6f5d6366aebba64936d34774479f71557a167e3789f557dad4dfffa58e7b4be2d2dcb5f0402eb24b07aee2a61e0ea504e15ede3a66a1b1d7a3763c401c401688f89c360556ea80b6dd8593170373d33a91df86f7a0febad01e1f7c4caf9ae28b37d864ee919b22da36c6afc9317160656970402193c7e29d72d2d8ba9710fdff531286cc254e736e5a9f73fd510e8cb03836016f9b17619f637fa1c59856129ed7ea686c1c2b17d1fa92330f3bc6fe963be49b41979b94166766c855931abb3ebbe8fb6facf853ecbfd1e836953faae4be8669959c0704cdbbedc69f988f6db8501ebfb0e0be1e6f3f6aeae067984b148d69bfb2ed711e76a9de25a5b0b61c0696c9128090d45cf2c0582bd11311ab5f19bf9b2b5e07de99eff085ccf0f3ac8fbde9bee6831316e9109d358bb91685f33d731e9507dbdb0741a17662b41a2da826bd3eeb2531b7b616f023cad4be531d025fa69e5709f5576b36bff9a95daac4dbd5ed908f82511adcace9d59dee7aaa25d4c0c44e3bbbffffe9b524890bc51d8be98686bc71d0750abfb7071cc25ec2d62f9da3a0fb5cad7612dee3feb18ecda31cf8cff9a3967232ed073ff1c327198a8dc960687d77bd572de5494f15d7eee91c7b9d77b066befb062cffc010f758c4fcf6bfe336474844bdf15aa9fd119b73f7d1c0735b4ef3deba3abf3527bcc70580e51a7eeba3cdb6fa634ab97e8981eca21ba53676b95c0335585dbffe43ba6a863f0cef2e3cf3dc29f5d05c407757e563a068ccce12d520b6e8d457249159d5fb76df759b6f1abba3b6ab888f9a16d418b6bdb46451c6a17cb3d7d97084513873ee3501f58b77fadb265acdfb7e5b8ff3ce03285dbfc5cbddbf63515fe4111c0016c67f38a592f9b4e3e9530a0a466c9eb3a46f27d3516c460b9f638c5e30c8c0e185d268b7cfea9c560baaa71ee5d34f94ec4511dd569a75a0f9f077a76df7b58b7d08637eab8b920469777a240fdde441d9046ca5a9d361b61e0a6ce5a797d36db31682c867ccaf953f4794224a4137141127a661ebb0985163b0e85c3bfaad30ed5317b65f9f185c7d8e5726f85833f2bea99fe9caba3f74fedf3aed41e721206f479170efd4713890d0f39b0218489754bf5b64a18b8d53130ab5177d7eab85eedf86f17e7f850245e88fed5b61e5d6abf7fa82fb0e9ab571ef7b9dc63d3f669d919e20074835282202b63d3d1b8bd4de011b33ebe371509e4bdfde669742e3b5e04b19d8369acbaa586f4558be2402d4775c7807ed5963850123a52ae7f5721f6b32f09040fb6ed5c67b67c9937f54ed540b7a947976d3aca8e6dfc79a0d3153bcfcc5b127597667f14c45d88996d3d878dc37c64dc9726b938a7d38afc3132eeca9240f99cbc0b59f626b3ba63c7fed4b6cc4e63d6773df7a1f5ed9b406da169bb765c210c485d0bb6ab8bf6ef575bed626979af55cb139aec5fabeaa64d0e9c9b1ae53a33803800493037f6e146ae6a20db8fc43742179e46e8f92185b80344ab5b150653a87bd8350037113af73c84a3ba6340b79d093bed41d48a8b38701db2bc1d67d98df15cafa97d834de2cf9b80b3f84b87fad685be599ee74dc0534a28ef5a97ec35e56455e55d9907bc9cedb95cdbd3bd435b5d3bbee395cfacaed68d8748cfebc24580f69814a5489783cf1d3af9ef964030b7bc5719f35f57d8dd9b86dbd7d901412aaacda8cf7ab5673c02c40168a813958ec9266cf4d6a0e8a56e84fa08048b0e3f76ccd9885103ef4c06c1eb96ea4ae873de3b3a097d583fb869ab8de93bb415637c8d2a5b876419f0b932cbe7eacc1ef2129e6edc226baa686ca9813a5987daf543c8fec4c1613e892490343dc3bd0cdc1643b6f3abc04b776e1b2ed743f93e5e458c6690f6feb343bb58d4fcff5836c7acc6d85db76cd9990071005a14068e2d1ba1f55aba013a91a90904ae4b0c4e755d1e8471a8063b083ace84852edfcd00eba86dddf115622e5aaac399a57338ee50db903ef679e0d37e5e6a10f1d6ab76c85846b8e63270fd4c195bc7ef24c6cc6945845ce87ad588fda8e57428d2e5ce449c14d1652799e5bd4e4d4582cb082246ddf665135139ae59862b075b02100720b030201d585536e5bac240d6f6b37658d4f0795619f45cd75f230ef853d741c97a561eb68e62e865054314076c8d3ce78cf9ea78db2c35bb8dd0bfae1b6a7b4df7cdf2be7e8e60f4be94dd4f428b25ea385e06aa838803bbebc4c661bc8e314eef2bc3ab94137ed6ac3f8b846cc279d3edcbc1f1ae23c08e02dc6adf6c23c401e88c3050a5005e9b6e470c0c95a9a3017ad685045f8952cb40edb00156571c605ba2fa469ef58c9247fbb67d3f31c606dbe71a75f09d65c67f979943c858fe47e02882aa733dc408cdd673da8c5f473d59876ceb005e46c8d5326dca296dc8b695e7390954de29dc6b2c07d9f6bcbef64d88c8ae4144fc220e402a9da70ca61b0b6140b2ef5e200c74d26990f7eb1a367741c9797116c040bde9517964548946b1ad3bae8ef4a8c5f7bde979ff5cec3223510477814fff527311d472222d77308ad9d66dcf3de9417d1067d556cc0f364e1f58527053676bbf969957fcff754236edb4e2ff1f22e6455835d0bee635ef11710071001a100546f9211dc23b73385c548ccd9feaeca90a49b0306ed1038803fe03d3a2a631bed67677d3f501510d2f9b7a7746156bbc9eba306eb10ed98a03938eb7952c3fc441fbcd845d6a206d2bab397367b35d59ccbe6a30e280b2b4fc5cc8a4d01735ef25351b57ea42d54cfc2a917b1d598c8131db97edb977dda3ada0795e339fd5a66417c9c1446524bea708862708e8e039b5e888a4c1cf63643287769cb4fcfd8b40f0b2c6203064360e9f3d5563dc6b098e6633ef9bc34a7d6a06dbfae62a5e1d77a49ef5a1af167151c65de9af2f039db6dc27f994938d589cc5280f1535aa848d072dafbe4c62c873d8ec1a250984478196a3ed1a77ee3a6c034edbaab31d6b5f855f5085ecb032df631bd9e6b191be6dedd307e97726061007a076a39fab512703ebc8b2014bc2c105a2402f593a8803460dc98c62fb3430e5e52106e891e5570a63fca2877904205d6ceb9a8c097ddb1eaa3733492a2a4e55d0952384b876e423106814d479c0ba6735f6a8c3745161b77c1605fab4e451c68cbc0c6e2cdffbccd48c205001e6648f48d155aa1cee8784c6e669c3ed6b6cbe4c14562d297e14050e9455e6d03f491f24b9509ee363200e407bd83a82776a282e23ae6982340c8e5b63b7f58c30a2d4be1904cf1d3e2fe52ca2c26ce003a18bf100cd8803b138e61504edb31f67cbd4599e076847629c2f1da39a26b6e34b0d67e558af5308025522acd82ccbbe89025b2c2ddff7d4d45f5e303d700f9d434479d3ee3218d7ba6f63936d6a5ea7dcbeaa260a1fd427985bb4eb9583af51f056dfd18cc913c40148875bed18e5c8100406c50a71c09b85a3385018e36f75addd9c480ce828b60e58f0dc040e6be57b3b8e69bf3151837a613cb6a32c71aa4e9f6d5e191b71e0cef3bd160e8bade821b3e9cb2188adf28c1a3952e5e41e69845a9d48a05de2c0558785179b3abbe9d0bd3adf6f69b9c085fe3cb26cc70b6d63f796f574ed38e95470ae7d5aef227f100720757ede369e688083478c4c5b95177160cb407708f5dc46bef34ebf8f48005d636dec84b118890b470ef7d8f73e481cc0952e199c19fb654edf18e60e0ea5cd3bad745c4a62c0c4c159118a59ccc500273296c62ef7c0d4782e133a30cbdee525055d1207c6966d7f63290614878b8078ad8280afc024fdd1ef1edf3b527b7486488038000d3a339402ec7070431be543420cf23f6a7c1f9100ba88ad217d1430419a8ba17f37a4f0d4fc59e79ab47069fc971a2c2c1d4aaff36b18f3d8430c28b82dee71c00e836d6242117b8e3dcb695704c96dc78598d30eddebc4b37d8db7da976b3451b1346759b7ef1451a1c6c4092201e2000024804f081898cf2174cff35fdfd63c152201740997fa5984be87c226fc7d35b417a206fd44a3085e7a9ce244963b1d0ad177d892f558974e150e8baf9350e43f5ab016d93931e1d4b5dde9fbbdd8234a741215a5bac4b1e5735d94c480b1f18b1a2aa27096116c0eb9bfb5a9b7e409912001fe4111000c123adb7a069b18d357814e57880499860502a4ea88de5a7e3cd8569c967b9577da9909f06e441cf8450d7f57e615ff6fbb4c44c466114c5f7808032208bcc98f9ff26791a81392947dcd3262bbdbb5a4e0a1e3391dba9614d576a2e677759ccf1c858107b5577ec9dfab44974c634c46a8137fe1d90fed1309441c9bd105200e00407c4840597f209ce63f9e073ca50cf87fca2ca0c36c1d4093d83ae0273a8b1c82b9c567ae86ee4cea5ae18987617ee290f03124bb0401c6a5ddef7669f95e7ddee5450d312255c6d49a9d82c0aa81babad6f2bf0d744a11095ee7f57add523f853800008381c8817046dbcfc62353f701442dcf180821d1fa6e5bd71775452e0da3ad9a857eb0141086f07ed69e02c1f4c0ff8d02dea284c7ff961f3f22083863ebb0cf1cda97b4cf5d494617147733048e161487bc10dc1a130476f4431bed87de043cad4457fca14ba80071000010119236c833f349297f157820cc3ab87612facfd4f27332e3e36d98aad16ce310cd0941ff4620983a7e6d12491c1021e971f6323ffe99dfdb243fc825e087adc37e51b32d5ff7e0fd7469dcacd3be8ae800896014c16d9c8ae0264b0ce45ecca7c993db80a77ea98958017100005a82591dfb81702e03b409978b409cab773a7b0a904a5dcfcca7d95f1bcec490738d20d0cfaf4cf5ba5a594ec02ce7b7ef48cace65d62e5472dabb2d676554cc5e9254acf63b1587fdc666dc7058d2b3eb73385ee92262c0b5f6bfe5e88065aa828e8c17225a689f102ac2f21281202ebddcade0875fdf8a6131315fb27a0af7eae8c871ffd7bf9e67bc7e008860c04d35f44d8ecb00a715e76a42f82d2454cf8b25033619f2a50d8c352b7e651d56316c69290c4c532c1f2d1bb13de459362a1c36cd5caf7f6279cfe39a7dcc8d4406d03aa222edc276d78265c5fb1e996f45a1bb36c2d05ba453f555c4800e8f194bb565a6da379dd43ca5080426e618a0bea4f891233dcafea4f890ebbefa92bd10074a624071ec53c1cf4bdf11057696bf580c6e80fdd03eda17098ed4d0230701a454c72571e6dad2912fd68b5eebe7b3f24cb23a2a13756a6c9c9f371ab29a2aff59769a5b7a3ff7daffd86eb95ad7f118d12ae23b58babd5b557b93889d51c56cf2aef643144ec258bcd3a189042210ac62085ab98f586cc77b72c89fcc3f57f4f12212647d110b3a290e388801bb9090b779fe02370600aaa09da421129c56ed470ed042fd5e69e24cdbba7d5e185532ebe38184a5ce3a36bb79d6e2fb596adf6363808f6a8e019229ff98e503d19131e085c5e70ae76b1f7ddca5a0336dd3d3c61af7c5260b281288031f7c3cc87d4439e72af737277a7f6715f5488e977d110b3a9373405e507eccf343662a4495ff5d3b481b6140d6e948b2b07fe62f6a8a300060370b4d287b389140c3df7e34fe3389734a1212afdb5726cc1ed7fbc6f07117c39e5bde79c4b6bcea8a03d6e30ad4c276767f7aa03e4e7638635743147602ef16e0d57f0eb97d69be047907bf798e1d21b7cddd251288832fede527639f4fea5128c88f77b9cffa777e88c830cb8fcebcbf64c581bc10475a9852a8d261bdd3c2768912280c8a51fe72255a00451be0133621a437145314476ae239109e909c103a20124c020a0492e55a12594938edbcc3cecba403e2c03e5cca9cfea91967d2666c3e39b0dbcdb486e8d0055cea6c0a0edbc3d0db9726961d1bbf9d0da22f319325e832b96cfc924e4bb4dcebfcf823f76737f9b194650b1a058f386021084874c042a303fed4c294423df2381da20040bd0131a398a20e843e4ed484d283149190720d61cf768cd9b21ce0da1cce567da74e8f8cddc5d677639d59eafa18de5abbd5dd25ea7c7fdd85e71c184bcbcf4d2d9dccdb9e450976adcedadeefa9ebce2f1db38b36bab381abf3dd58b948e4794924f0994093881d598227d1efff99fbbb994e848f527a17ade71cd0a40fc57114e0946280cc583a00b0d7881f59b6b515a51575205cebcc4ee6d0f711b60b29f629fb923789c33f1f60ae8cbbadb268db0191d9b8aaa8cb75cdef17467ae793a67560ecb04d4c2809db665bc93fa73bbed7b74484aed12e6d273795b677e670bfcb9ed7efa9e6a471c9d134360d4e68a98f39d19c044be39f33a1c857f03a3fd79ddaddcbb693e5b7220e4410048ac178ca1685fd72623132a260e360de916fe0abba38375fb66dbbcecb2648789f0a0462acfdee309000a4d22e8ed5303adff1dfaf5adac22f05365bc6a2ec3d7fd162be84fb9a9f591bfb259db3049cad2120edce2631e1b633b93d763df450bc73b15d4e12b0355dee779692389097dddfa57ffe14d06e9ca9ad6adbef4c4c0bd1aeea73ca32f8b9de731d9ff644dbf48bb68582c69615e8fa8aa5e60f1043f832a030f0462a11c240ef1851045198587c86a881fd9c870c61538781fc0ed0356160a24ef02e61e0f9808581434e5aea82c63e5c6cab699f439f13c276b67f566ab3c73bda6befb62ff4584a336df9965deef7f4402e892ed896b6eff0de7448649425ece6939811ca962b8482224fc1a2c9848651c5014d2a280fb489200808b25ef797fca5ccc82bd04b3030da3352d9efb859439ff2862e0903624cbfdb339edfb2e5e64e63ff3261a7f9a162e6d4452c3e32440e34e1006f2c1d91d35246fe5d4e705fdbea7557c4017d972e89f8e68996f93470b964c62f41615b02c14677367815f8d465a160ad390aa28e25c1c501b9e1fc9896920abe30fe6b310e211566ac7b51423f617d7578a37e62d11eaf58ced1ac38a0d1030f142b74a00f917e7911c891ec2bfb262bda729aab96236515fdd3bda3b335237aa0116c1dfbd91ee7edbac763bd4b3f14753bbcc0eff2b13d271a3d701a61dbd6ce8d271a45f04b249b4e965948b2feffd468fc28f5209838504409984fa1696f8ddb96833ec2c084a4839dc5f6bda5200e8c7a56f63603e09c2a5ac97984fd91c9f1005d40fa87a3c4fbedb659a7e2345b5ecfc60077715e8e4ccf93a6a58046e8d838205375dab6edf23e47acb93a956ddb3daeed6599a800370d7cbeac8b954f27ae2726eea48f44e3bfd3650741a3096a8b03bafda0144211257014b9cc0b61806504fd1707268803418dc491a9cefe4ad4807d9d0d3d08da8803441740db9c57fd7f04e1ac2fe2401b21f736e368a523a5d14d772ef54477b180f69dca5d62cd5ddd6d2e5346a35d5cb6c493e8815997eed7a43191b36d9384ce39626b8f26e7136a22c1d802415117249aa0c84d507bfcf516075414908ee59d85b18030003e8df808e322285503c98361ada8cb00157a16d0a65d105d005d60356481400dfd7d06e1ace1b2a91a43afca5bddd51c43be715c238419c3d7d8cefe9fd67c977db479bef97ccbfd96ebfdbe486039c4b64d1254007598ac4ad2366a502028ca5e26e9ffd42507de75d9591cd812059adc564b0a768a30d00bc3c975db16a8891a6855510353072311c2cf02da080d19c50e1d401c913ff37e479cc38b81ae3f3f143db06ca8df3fb61007ac1d120d6377491026cfba22ff40547b4a9c27d70ce9624faf0652366f1cebebb243f72bbc4d50800b3671622bd6a41c05a302c1bce1cb5ed61109be771005e4e4a2509eb754be8b36f67a8468c86066232e3d265e69b1e18fba5ed0a5bdc80ff1a6c53db8bb6064647939eefaaf97e200055a8a6133c0af22d591d86d6c64791fe380fb24db5e73c4521a276e8d7d4ea14b3da49c1fb61c66d7fa76afdf5f7744c4cc0e8c7132aecd1bd8eeb16adfed571e757f9a1f7f387c5e425ea5ffbca09dc5b38f8ddb64dd6a401301d2c62e8c7d62f4331dd3a71db95f536a5f6dd8c9eb1d75ef489f23c4e4898d5d749d7a25ccfd5709f7bf30cd4eaa1763f085e6045cd84eb05b450ee4279597fc678bc2c09d667f04bf8693222e0e40f0c42b0ee73be9411d595618f392b1b82f111a3167a81e0e946f88fa583568dc7938ce9344decba885f7370afcb9b6eb5f2a6dc53789d991d6f1e278e978c89a4a8958fccfbcbd6c8aa884c4c58143bc8c1912ac336e87faf55b9f77a97d90eb565d32feac63665897e78d14a1907c9bf6c807914a22c2510365736fdc7717926d47972dbd4bb95fd77e41fad67731732648dbda338bbfcfd97c11a8bddbbcbbae4c6cb5e5c71ee918ba5681a29e38909f64ac5b12be6cb9400735a3e9d8a0461d7d4c978eb798790815a6241defc6e1f3170dbcf345a4f34a399f571888310c54db7a19da581c476c37fb1cf3b3008684cda0ee33b01c27d28f1c07fe5caa46fdb8a57aef730f5ec2b28696df987691314166447ecfdbdebdccc2a716ba6e398bf736a240b032fba3061e9769face1e6bc483eb6c5de1c02c42be2b755aa44efe69dc662a4731db49c236d56dc0e8ac10edd8e61d8f6ab64579dee73e02411bfd8af61dcf3dbefa3abfdf2c74de04e95fd566de55c70ef573b572cf582e8bbad3312979fefad7f3ccb82dcb8ad1de7e974d04aa7636f8c70161403a59091d3b4da04c8716eeecd2984ebbb89e4f3b6b17a55beae1a68e2125df958ed37cda6ad365578d690345f222e440a40653660ee71910037f1229bc30a693de9663b4ae3024e6beefcac2a8bd751d00f5bcb6fd773467558d03dbfbb80855ff5b7af6b6ea7d63e240e93db569e46c3b9d2f757c989bb4b071a0df861687d5593e3d200c4c02388853cf3af0a2785775c63b8d1458aad3528c732e6b9d9b6827298a0349440d38ae93affd0e74fc745dcf2ff52a0b1df122e7ab9a50d0fbbdf238bd446515f95e6a39e6da4637dabf3e467eed288b7545df5c27e7c8dcc2569f9a6e9125700f3261283b1becadd7dffdfdf7dfdba2c0b1761e970915e63f879488509d3a9775296fba1816ae33f2bf7b7cf54eeb6876c8c0d10e69a287eb1aae5d469ebc97e3d260759c5f7f52f18c73e3167923c6d6acceda31155016159dea55ac35753a78bcb3fcb818aaa31002850e847f3a7ce5679772d6727d5bf1b12b7d7ff796e73cd67a755a5146cec6bc3a1c2f1cdec324c68c92c77d8cebae4dd6f0cad70efdc9b86e1d74bca6f063e835d81e6de0b7fc1e169ed792babb32cdafa1b4e9432729aca9b6ec3342f6fd237d27a74db473cbfeab8a2b3d4756d51e746c29c6f37dd7fca9eaf9f4be37c67e92c0bb9d345cdf56a67af9ef3f13691b4b073fe3a6cad68ad426b7ebe9bc4e9fadf5775eea336deaaa4b39ed2c3bed13328b6b8d4b36f3b96d5b5001e124a47d61f99e3ae7fbe8c4fbeb846ee979ee5f2f0f8a032a0cd4ede88393dff87703110564609f3918d2dbceeba26bfbd67a0821fb3abf6d46169dd53ac0b50f3a981ee240f99916b649024be157738be79ec6483ea8f57762214cec328ae73a78dd7b5cd7f6d97795c5ccc6287574bceed48858d634e40b7e71795f3ac0cf3c0c0aa7f2b0bc8fb971cf5553dc8773d22cbde685479bf3ae8335ae79a7d75c0510267cdb80f04aef61ed79ed99b19be16992686297c77bd938968d53df5fbacecc1c4e4078ab7d7f0c01b0ae0353773cb71adb4a1306730f3bf74afbeb75aa89152d265cae5a4cb457777c0a66e36a392d3dfbac6bad0756fd76a96f9eeeb037ad9cdb1a82c6be7e60fbbe6d23ed5eed4aa2ead0fedfe83bdc588c29550e74eb75d9531c08f92e437195fbd9d39de240aac240e180e95a8d3e0901d2c0c6e6cb4c74e8d99772072065b74c71400b34f3e0637c4cb5ecffa879ae5787324ed71007b6458cacf42e0b26fa0c63cbfa736d026e57a803d6d4616071793ff7fb0c0155df677addb3086d66b9cfb1b750c8b79dbf95beb37bddf1a0785f5335188e2ade7d6506e2b6dec38efb5894fab446eea3a56bb65ede6db6811ace69d304890809d04ffa8a270fda777ceeff8b7aa1c2e248ebbed4852a014e8cf279ccb2b08c588b66dc9a1d115b11db89571fd9507d3b3446fdd2f4ae44a53eda46e071b58b36c673365fdbd0b266bdb82ddd47b19b8a298d499303e7b71adfb7449595692749f68db6af7520f1e2bad4b73dee3ea36db5108eaa9eb193c280fada757d8258bcc9fdeccf4255792bc345a2c240d1d07a250e345039caeff24ccb2f3971a0d4293421107c33a39b5ffbceb3b3bdd58125f6405bcef0ed5b6f6ef4b943b7a1692483ab38e77a4fbbb73186ebb6997d8e91f493b6216152af5ee861f66c8578e89d4d2d8d9eb6dec3362f22b58143f7d1c6355328ef36dbc0ce7e5cfa180d6b6ecb80ddd5fe56a6e51d3b240457cb458c4297d9d2237dc7e745bfefd887541af5819f73a991804d6e795d15ea3d897c2fae7d64132cf7d809772d6d571ca38f2edb454b1fdb56ebcc441ddbb9679f75ea69b74ab4d6c245ac93365c8aba68cab9b4b51d33b5af6dcbf0bcdc2e1dfab507bd9fe497f81c20d51d765ec80604c51283ef55c9f009f16992994967eb15882010e43fc63acb1e63e6e95098b78bb357acdd5ad588c2785c636fbeac9bbc3071665a1ef45e17096526ee435d2d0cfd993a894dd655802451037b76c050be5307aa9865db54081fc5cf514da1e1318156dbb3ba3a5e4c4b635c8cbe63db695e36fddcfa9c17a519fb188ef9833a848b54c3fb131507e614cdce3a2be5b5ac2912d8d6db85ab28b0c3569e6b18ff3ca2fde8d47f683b1c598c0375ef69dee5369ffbda2393ee24fca33f94df63f6d7bf9e6fbed7e504a9771a27b24e6357d2840ef373c3d74bde4194f07c0d412b8ca73a9d74e11c57757045277bb4470c90efae032aeec5c050ccb015e1625335864f033c736602ac63b6a008d78cc5e6c03b8b69f4de5b0c843335f40b81a7ae117cadef6cd9a1f7d0749fb649e49a299477ab6da0240a5ca8c17b72c0895b3a0a94d9d63546e68b98ead3cee6a6e5e881edbe43fb8fa2ef980470488a2508d66ba1233fa7dc4bb1a55ab1debaced876571ad75cc6e2d8edc4b58f6ca48ee5e57e5d6a2b8f395c5a149c63f7d1eb40e5568804e5657f75dba56fbdb5e947a6a57c06756d9020fd478432bc2b8d219d1505caf67fe2f777a4e53df9eefff8efff676a99130f55ded190762d183a25a3705432eeb6d7f93e94068762562af3c88a3a335f66b6d6a1665cd4819c94ce7db0e32dad499f982febd6465b1dec4dc9802fdff3865ad36a7d2dded9c87cd97a696cbe169e8a35dd9b525dcd283de8585dafdaa9c069d70ec73141fa54d748c71f53ee1ff5b9c6a5e3b8a2ff2844948df6fdeb8ed499c9d6336e8f6dc5f331b6d52beb42b413437f91c2ee041db641b7dbe5b60d7a67be88439fc775f9d974bd2dede631d2e3d0bd36d27f78946156b28d7ad3ee7ff8f5adefee6c6df09388036b9376984399dbbffef57c6c000000a00d83b9c801b42f9cf579ec594a358257a6675bd1010040bff8e1d7b75563666abcf947878401e1342fe425550d0000203961e04d13e1cb1a6d2302c183e55726bc3d00006858189028896587840161fc8f0e96f5a508045ae0000000d0be30f09849baa9fbd15058dbcccfd80b0000d0a430508c99a75dbbf77f74b4cc65bd618640000000d0084b7378f663d9f4da668d20b8421c000080848481495785812e8b03460b7ca32f0000000022a08955ab8c9caca5dbb3c92570ca5b040080068401192fdf996e2d2528732fe2c07587df8114fcbbfc452c882200000088c2d4c6a068e3c62c336ddff20a010020a22830ce0f198f5e76fc51321107563d78272fcca728820baa270000401834d740e55ed52d6fc97953f1ff6ce5060000314481638d16f8c3f4234a6df98fbffef57c693eed31d975248ae0f7fc05652c350000000882d578aafb59a70ae2000000841606a6f98f3e440b14bcf9eb5fcfefbfd77fc8c3bdebc9839d994f4b0d64b9c42c7fc80dd5170000c00bdb257b220ea43adeae798d0000105014981b8ba8ba0e71a7cff4292161ee4067f98fdf7af6eecef3e34fddf670425506000088c6b8c56b9f55fcff8ad7030000754581fcd8e4bfbeed9930205b115f48d480fca3881c108160a17b325ef6ec5dcaf35ce6cf266b1217f9736224000000f4401cd09c0887b8b34c5a080000b02d0848f4dc343f663d1304ca48a4fde771f2fbf2ffe4ff218a88e9a14020c8ccc259fe7c1236215b1f2d0b850400000076b2b1fc5c5b0981a715ffbfe415020080a32830329fc2ec656c3beaf1a33ed7fc839ff9eeefbfffde5520a28ebc1ec0bbbf529120a3190000007c8dceccff616b64fcdbfff88f65c3f7b7318767737eccef69c39b0400800a41e058c580a9a95eaed6756429c1a41c3170501cd0029a984febf48e06501f249a60a9420146040000c01707fcded2169010fe5183f7553591f12abf9f396f1000000e8802131504fa1e2550706b3ee518d8e9f3ee1507b4b08ed5693e1f501db9d5675e2114000000e2c0bfcb52bc17961f6fc421d7ad13d7070c3911fdc7f9bdb07c100000b67ddc7149103819d0a3bfcafddb8363f44171a0548017ea301f0dacee20140000c0d0c50171c4ff74f8ca4f319300e6f7231317597e9ceef9c863b824890801000041e0b34f3bddb58cc04b1cd00295c1786eec670ffa2a146436050b0000d02381c0257a209a73aec2802c793cb41eb4f1dc07000090a4202042c064a08240311ecfb6930e0611074a853c329fb2fd9f0fb8aedda97192b1352200000c401ca89aaddf65905ce44e7a16f01e463af69e220c0000c00e3fb5482a58880247032d8a07f5d717aebbf3398b03a5c297029f9bfe6773b4e15a8d26a20a0000a0af02c158c73a1763eb8dd80a75d7fee7d79eaaa17374c0100a2a4600004027048149490c38a5441e77e39bfb2e89f71607b65e880cda97bc8b47ee0aa140c5820d450200000316083ecf60b888041aad2006dfdc1c0e07bd516180e4830000fd1703c62a0414c711a5f2799cadbdf35e6d71a0f4a2463a805ff092bee2764b2cc0780100802e0b0432de5785f7ef4322edd63a266e72877eb3755e390ac3af6af9e2e35a4a96110000f45e0c181b960aec4226a5650c5c84f231838903a517284aff54066c33ccc40f3662c1da1059000000dd1609e63ad6376da87d368688160000e8a518303144061c4222e6962e89065b1307b65eee850a05e7bcc383464e560806e42c0000800e090423d35cd4a0441dac88140000e89518501602c688017b91683919ff16312797a38a03a5975e4413c841a2886a6eb6040366460000206591a0c80f20e37ca844c5e51c3e2ba20400003a2f04144b048ae800fcc26a1e85f1185102ad89033b2ac5d40c77bf495f03696dbe2c47582318000040c2424161f8c94ff9f768cf98ffa0639bd19ff766473e020000e89c1030da1202880ab04796a18b18b06cdae76b5c1cd82114cc0c490c7d2b4d2118885890512400000000008010d0594160d5664eba56c5811d42c1d410515007220c000000000020a6cf364208e88f2090a438b04728900ac75a947a3c94c4828d0a06243d040000000080433e59e1fc1762c019a5529b6bf5cb5629ee5a97a438b05529a53216fb5ab2eb41386e0bb1a0100ed8561100000000607022c0763480fc4e24771864a276551204928eea4e5e1cd851790ba180e50771b851d16083680000000000d04b11a0f89d28edf0dcaa20b0ea5ac476e7c481ad0a3e2a0905f293f52ecd88066b150d589e000000000090968f3451c7bff0958e1101a2526cbdfb1821d0e59c6f9d160776348471492c604d4c738d61a30de2de7cd93d8144880000000000f1fc9ee392f35f440330591a9ff25281ac4f51d6bd120776349a8936980962412bdc9404838df9921011e10000000000e0b02f33325f9601948500a2009a1703b29218d0dbe8e95e8b037bc48271493040594b4b3820bf01000000000cc93f291c7f048074b8db120306e39f0c4a1cd8d318cb6201090ed3e05685834cfffdf8336f98194503000000001df237ca8e7f9104b038f03dd2f13d0a31603de4c9ca418b037b1aefa42418b014213d24ac676dbe441d7cfe4982440000000068c18798e8afe59fccfea7c99dfa0e8fdbb933f98838e0dad8cbd105631a7967c403212bffa4f10300000080a32f30329f66f9b7230070febbc18dfa0245d2f40d45823810ba932884823182412729962d6cb60ea20f000000008663d3178ebe30d19f85e32f820061ffdd1302d6252100bb1e7100c10082752ec67c59ba502c5f200201000000a0db8e3fb3fe08018038d09a6030d29fe430e817b2666953160eca62029d1400000040341bdb982f89fdb605007624eb0fc592e1cc7cd9161d1b1b71a0379d59592c981842968640b18c61978840240200000060237f3dd3bfcbe9c7661e86cdbc298b01e408401c1872674894c1b0292211be120fcc97c48a442300000040d7ecdcc2b9dfe7fc33d33f5c9b37d39f1b26cb1007a0ba332d3ace49a9134534806d216163768b0a1276754f510100004004fb7497937f8cc30f258a25016bf3252200fb147100100da0656ecba241e9f7b2b040e8160000c0f0ecca6da7fe7887e32f3f09e9877ddc959c7f4400c40148a473dfb53c81ce1c7c2894de82acf47b595c60a9030000403ab6e0a4f4cfb2735f0ee9179854021f8ac9a6ccb01c0071003a3f5894c58363060688386818f375024644050000003b9b6ddb912f3bf9c2b600c0241084a4bc14a01002b0db10076060035031f0201c401b94732818f3f572876d61e1f1df84aa010040c2f6d5b643bffdef72f8bec1ee82960480c2de5aab0090513488039402201c40d7b9dd120f8ac1ae603b8a4140600000001bc75e986cfd7bdbb997cf33830f080080380083160eb605040647e8fa20fa958060be161d84ed4195503b008074ec9232bbfeb6cbf167d203ba4a3139525e02601000007100521ba4cbc241f92703300c859b1d7fdb35586fccd7510e86811d0006e8c81bf3ed6cfc3e075ffe764a49c200b82bd9095f1dec30058803d027c360a2bf6eff443c00d8cfaee806e17ecfdf8dd91dfdf0f81d221e00a0628cde6664be9d75dfe7c01bc675006be7bf3cfbbf668c06c40180af0d937d91076294b06c01202efb448882ecc0ffdd577c5720df0340f538b8cf112f3339f07f871c769c768066d80efbdf1866fe01710020b8d1b42d1c948d24f9f711a504d0696e2c3f97399c3373bc078cb77e8e1fbb42d74d0d27dbe7b3e2f4237403749bed59ffcfe30c4b03017100203d0370a40618020200b4653486c22622a30eff6b7efcbf11cf3f097c3efa700068c5f13744bf01e20040ef0584b2f15afc8d84470030244398996c00180245645a11eaff590060c61f10071007002a2985a196a310ca7f43440000c4010080f69dfe8df912b95538fb2c1303401c006896adb5ac13fd39325fa21308850500c4010000fbbea970eabf99e93784f803200e00f481d25651e568849141480000c401001896c32f64fa936dfc00100700601f7b2212b67f675b2a00401c0080a6296f7f7bbfe777c2fa01100700a00d4a5109c2bedf894c0000c40100d8d51f6c2a9c7d66f701100700a08f6ceddab0bd4ff7a4f4fb080702007100003ac3adf912b6bfbd256a56fa9db5fb00803800007efcf0ebdb6d11a1bcf461d7ff11a50080380000fe6d74b3c7b1df94ff8fedf800007100003ac3d6b2876d216164be44311883b000803800d00fcab3f8c27aebdf65a79eb07d00401c000038c456724661fbdf23f3b5b820ff774ac901200e00d4e466ebdfeb0a679f507d00401c00004899adc8056164be1614845d9fc17902c40180eeb13d63bfbdf67e9763cfcc3d00200e0000801d3ba21804dbbf8d70c6007100c0ca991736e6eb35f7fbfec66c3d0000e2000040f7d911d5208cccb7910dc22ed1a1f83b791a00710062d799cd8ebf6ff6fc7dbdc3e167761e0000710000009a666bcbca6d267bfebe9d30729b334a1671009277d80bb23d7fdf1566ffd9a967261e000071000000c09b1ddb5dee6252f1ff36e730866809c481b49df22ae7dcc6497f846dea0000007100000020007b966e1c62e279a991d91fa9e14a6cf1e3ffcb8fff2501e7d9865de1e9366c1cef81907700001814ffbf000300d9bd5e188484e66a0000000049454e44ae426082	1683	Muthukumar	S	MuthukumarS@s4carlisle.com		\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Genaral Manager - Editorial Services	2016-08-01	Srinaath Kris	0	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	2	f	\N
1	1	\N	HR001	HR	Admin	hr_admin@peoplehub.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	HR	HR Admin	\N	\N	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	t	f	1	f	\N
4	6	\N	842	Umasangeetha	P	UmasangeethaP@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Manager - Indexing Services	2011-04-20	Muthukumar S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
5	7	\N	1043	Aravind	K	aravindk@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Dy. Manager - Copy Editing	2012-05-07	Muthukumar S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
6	8	\N	1216	Murali	B	muraliba@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Manager - Automation	2012-12-27	Muthukumar S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
7	9	\N	1288	Annapurna	B	annapurnav@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Team Leader - Copy Editing	2013-05-27	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
8	10	\N	1452	Lavanya	V	avanyav@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Lead - Copy Editing	2014-01-16	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
9	11	\N	1718	Madhu Malini	N S	MadhuMN@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Manager-Editorial Services	2016-11-23	Muthukumar S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
10	12	\N	1721	Priyavarthini	M	priyavarthini@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Lead - IDML Conversion	2016-11-28	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
11	13	\N	1755	Mahalakshmi	G	mahalakshmig@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Dy. Manager - Copy Editing	2017-04-03	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
12	14	\N	1829	Anand	Jayaram	anandjayaram07@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Junior Technical Writer	2018-09-05	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
13	15	\N	1833	Janardhan	Chirumavilla	janardhanr@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Leader - Indexing Services	2018-10-15	Umasangeetha P	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
14	16	\N	1874	Srinivasan	R	SrinivasanR@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Dy. Manager - Editorial	2019-08-21	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
15	17	\N	1883	Rajavalli	Selvaraj	rajavallis@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Technical Editor	2020-01-06	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
16	18	\N	1885	Shalini	Bakthavatchalam	ShaliniB@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Lead - Text & Permissions	2020-01-06	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
17	19	\N	1892	Gowsalya	M	gowsalyam@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Technical Editor	2020-03-11	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
18	20	\N	1896	Gurunathan	R	gurunathanr@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Asst. Manager - Rights & Permission Services	2020-06-01	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
19	21	\N	1917	Sujatha	S	sujathas@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Project Manager	2020-09-02	Umasangeetha P	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
20	22	\N	1919	Gopalakrishnan	S	Gopalakrishnan@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Manager - Rights & Permission Services	2020-09-23	Muthukumar S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
21	23	\N	2028	Chandra Kumar	C	chandrakumarc@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Technical Editor	2023-12-20	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
22	24	\N	2041	Sangeetha	A	sangeethaa@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Leader - Pre-Editing	2024-04-11	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
23	25	\N	2044	Anbarasan	K	anbarasank@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Technical Editor	2024-05-27	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
24	26	\N	2047	Saranya	Kamaraj	saranyak@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Technical Editor	2024-06-24	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
42	44	\N	2169	ARUN	S	aruns@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-06-01	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
43	45	\N	2155	ASHWIN	R S	ashwinr@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
44	46	\N	2152	CHARUTHI	V	charuthiv@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
45	47	\N	2161	DEETI CHANDRA	D	deeptichandrad@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Accessibility Engineer	2026-05-20	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
46	48	\N	2156	DEEPAK	V	deepakv@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
47	49	\N	2162	Sindhu	G	govadasindhug@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Accessibility Engineer	2026-05-27	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
48	50	\N	2157	HARINI	K R	harinik@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
25	27	\N	2059	Shalom Kumar	Sigworth	shalomkumars@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Deputy Manager Editorial	2024-09-05	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
26	28	\N	2074	Prakash	B	prakashb@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Copy Editor	2025-02-11	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
27	29	\N	2089	Supriya	Subramanian	supriyas@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Assistant Manager Editorial	2025-05-21	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
28	30	\N	2096	JUDE RAEYMOND	J	juderaeymondj@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Copyeditor	2025-06-11	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
29	31	\N	2101	Sumathi	R	sumathir@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Asst.Manager - Copy Editing	2025-07-17	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
30	32	\N	2103	Vigneshwar amoorthy	S	vigneshm@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Senior Team Leader - Editorial Services	2025-07-23	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
31	33	\N	2110	Manikaraj	T	manickarajt@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Technical Editor	2025-08-25	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
32	34	\N	2111	Nivetha	M	nivetham@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Sr.Technical Editor	2025-08-25	Srinivasan R	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
33	35	\N	2131	Patrick	Nithyan	patricknithyanp@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Technical Editor	2026-02-09	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
35	37	\N	2150	Selva Bharath	P	selvabharathp@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Media	Trainee - Software Developer	2026-05-06	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	4	f	\N
36	38	\N	2163	Nirmal Kumar	R	nirmalkumarr@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Technical Editor	2026-05-29	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
37	39	\N	2165	Saranya	R	saranyar@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Lead - Copy Editing	2026-06-01	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
38	40	\N	2174	Viswanathan	K	viswanathank@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Technical Editor	2026-03-22	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
39	41	\N	2177	Bhami	M	bhamim@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Managing Editor	2026-07-01	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
40	42	\N	2180	Ramya	T	ramyat@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Team Lead - Copy Editing	2026-07-10	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
41	43	\N	2184	Shaonli Deb	D	shaonlideb@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Asst.Manager - Copy Editing	2026-07-17	Madhu Malini N S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	2	f	\N
49	51	\N	2158	ROSY	B	rosybalaraman@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
50	52	\N	2167	JAYASHREE	S	jayashrees@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-06-01	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
51	53	\N	2154	SALOMI RICY AMIRDHA	S	salomiricya@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
52	54	\N	2153	SHREE VARSHINE	K	shreevarshniek@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Trainee - Software Developer	2026-05-11	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
53	55	\N	2164	GAYATRI	V	gayathriv@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Web Auditing Team	Accessibility Engineer	2026-06-01	Gopalakrishnan S	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	5	f	\N
34	36	\N	2149	Hemamalini	K	hemamalinik@s4carlisle.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Media	Senior Software Developer	2026-04-29	Murali B	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	active	f	t	4	f	\N
\.


--
-- Data for Name: holiday_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holiday_overrides (id, date, override_type, name, holiday_type) FROM stdin;
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, name, date, day, holiday_type, is_published) FROM stdin;
1	Pongal	2026-01-15	Thursday	Festival Holiday	t
2	Republic Day	2026-01-26	Monday	National Holiday	t
3	Good Friday	2026-04-03	Friday	Religious Holiday	t
4	Tamil New Year	2026-04-14	Tuesday	Festival Holiday	t
5	May Day	2026-05-01	Friday	National Holiday	t
6	Independence Day	2026-08-15	Saturday	National Holiday	t
7	Vinayagar Chaturthi	2026-09-14	Monday	Festival Holiday	t
8	Gandhi Jayanthi	2026-10-02	Friday	National Holiday	t
9	Ayudha Pooja	2026-10-19	Monday	Festival Holiday	t
10	Deepavali	2026-11-08	Sunday	Festival Holiday	t
11	Christmas	2026-12-25	Friday	Religious Holiday	t
\.


--
-- Data for Name: leave_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_audit_logs (id, leave_id, employee_name, action, previous_status, new_status, cancelled_at, cancelled_by) FROM stdin;
\.


--
-- Data for Name: leave_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_ledger (id, employee_id, month, year, opening_cl, opening_sl, opening_pl, credit_cl, credit_sl, credit_pl, taken_cl, taken_sl, taken_pl, closing_cl, closing_sl, closing_pl) FROM stdin;
\.


--
-- Data for Name: leave_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_policies (id, leave_type, yearly_limit, applicable_gender) FROM stdin;
1	Sick Leave	1	All
2	Casual Leave	6	All
3	Privilege Leave	27	All
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, employee_id, employee_name, leave_type, from_date, to_date, total_days, reporting_manager, handover_to, emergency_contact, reason, status, request_type, approved_by, approved_at, rejected_by, rejected_at, permission_date, from_time, to_time, cancelled_by, cancelled_at, cancellation_reason) FROM stdin;
\.


--
-- Data for Name: meeting_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meeting_rooms (id, room_name, location, floor, capacity, room_type, projector, tv, whiteboard, video_conference, status, created_at) FROM stdin;
4	Conference Room	new one	Ground Floor 	10	Conference Room	f	f	f	f	Available	2026-07-09 09:31:47.240471
3	Conference Room New Wing	New 	First Floor New Wing	10	Conference Room	f	f	f	f	Available	2026-07-09 09:30:05.844255
2	Main Conference Room	Right wing	Ground Floor	16	Conference Room	f	f	f	f	Available	2026-07-09 09:29:08.737446
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, resource, action) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, team_id, created_at) FROM stdin;
1	HR Admin	HR Administrator Role	1	2026-07-21 04:41:09.889316
3	CEO		3	2026-07-21 06:59:13.227465
18	Manager - Indexing Services	Manager - Indexing Services Role	2	2026-07-21 07:13:46.501519
19	Dy. Manager - Copy Editing	Dy. Manager - Copy Editing Role	2	2026-07-21 07:13:46.501526
20	Manager - Automation	Manager - Automation Role	2	2026-07-21 07:13:46.501526
21	Senior Team Leader - Copy Editing	Senior Team Leader - Copy Editing Role	2	2026-07-21 07:13:46.501527
22	Team Lead - Copy Editing	Team Lead - Copy Editing Role	2	2026-07-21 07:13:46.501528
23	Genaral Manager - Editorial Services	Genaral Manager - Editorial Services Role	2	2026-07-21 07:13:46.501529
24	Senior Manager-Editorial Services	Senior Manager-Editorial Services Role	2	2026-07-21 07:13:46.501529
25	Team Lead - IDML Conversion	Team Lead - IDML Conversion Role	2	2026-07-21 07:13:46.501529
26	Junior Technical Writer	Junior Technical Writer Role	2	2026-07-21 07:13:46.501529
27	Team Leader - Indexing Services	Team Leader - Indexing Services Role	2	2026-07-21 07:13:46.50153
28	Dy. Manager - Editorial	Dy. Manager - Editorial Role	2	2026-07-21 07:13:46.50153
29	Senior Technical Editor	Senior Technical Editor Role	2	2026-07-21 07:13:46.50153
30	Team Lead - Text & Permissions	Team Lead - Text & Permissions Role	2	2026-07-21 07:13:46.50153
31	Asst. Manager - Rights & Permission Services	Asst. Manager - Rights & Permission Services Role	2	2026-07-21 07:13:46.50153
32	Senior Project Manager	Senior Project Manager Role	2	2026-07-21 07:13:46.501531
33	Manager - Rights & Permission Services	Manager - Rights & Permission Services Role	2	2026-07-21 07:13:46.501531
34	Team Leader - Pre-Editing	Team Leader - Pre-Editing Role	2	2026-07-21 07:13:46.501531
35	Deputy Manager Editorial	Deputy Manager Editorial Role	2	2026-07-21 07:13:46.501531
36	Senior Copy Editor	Senior Copy Editor Role	2	2026-07-21 07:13:46.501531
37	Assistant Manager Editorial	Assistant Manager Editorial Role	2	2026-07-21 07:13:46.501532
38	Copyeditor	Copyeditor Role	2	2026-07-21 07:13:46.501532
39	Asst.Manager - Copy Editing	Asst.Manager - Copy Editing Role	2	2026-07-21 07:13:46.501532
40	Senior Team Leader - Editorial Services	Senior Team Leader - Editorial Services Role	2	2026-07-21 07:13:46.501532
41	Technical Editor	Technical Editor Role	2	2026-07-21 07:13:46.501532
42	Sr.Technical Editor	Sr.Technical Editor Role	2	2026-07-21 07:13:46.501533
43	Team Lead – Copy Editing	Team Lead – Copy Editing Role	2	2026-07-21 07:13:46.501533
44	Senior Software Developer		4	2026-07-21 07:14:57.726513
45	Trainee - Software Developer		4	2026-07-21 07:15:08.00855
46	Managing Editor	Managing Editor Role	2	2026-07-21 09:27:12.882636
47	Trainee - Software Developer	Trainee - Software Developer Role	5	2026-07-21 09:29:41.238036
48	Accessibility Engineer	Accessibility Engineer Role	5	2026-07-21 09:29:41.462548
49	Software Developer	Software Developer Role	5	2026-07-21 09:29:41.669801
\.


--
-- Data for Name: room_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_bookings (id, booking_id, room_id, meeting_title, organizer_id, organizer_name, department, meeting_date, start_time, end_time, attendees_count, remarks, status, created_at) FROM stdin;
\.


--
-- Data for Name: shift_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_requests (id, employee_id, employee_name, current_shift, requested_shift, reason, reporting_manager, status, manager_comment, created_at, approved_at, rejected_at, request_type, approved_by, rejected_by, from_date, to_date, shift_date) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, description, created_at) FROM stdin;
1	HR	Human Resources	2026-07-21 04:41:09.883812
2	Editorial Team		2026-07-21 06:33:12.526238
3	Management		2026-07-21 06:59:13.219218
4	Media		2026-07-21 07:14:57.718337
5	Web Auditing Team	Web Auditing Team	2026-07-21 09:29:41.235929
\.


--
-- Data for Name: telecom_directory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telecom_directory (id, department_name, team_name, employee_name, designation, extension_number, status, created_at, location) FROM stdin;
1	Management	CEO	Kris Srinaath	\N	123	Active	2026-07-06 10:29:12.100978	Ground Floor - Right Wing
2	Management	COO	Nandakumar R	\N	124	Active	2026-07-06 10:29:12.10098	Ground Floor - Right Wing
3	Management	EA - CEO	Jayashree Muthuramaswami	\N	122	Active	2026-07-06 10:29:12.10098	Ground Floor - Right Wing
4	Administration	Manager Admin	Sujatha Nair	\N	125	Active	2026-07-06 10:29:12.100981	Ground Floor - Right Wing
6	Administration	Pantry	Shanmugam	\N	201	Active	2026-07-06 10:29:12.100981	Ground Floor - Right Wing
7	Conference Room	Conference Room	Conference Room	\N	129	Active	2026-07-06 10:29:12.100982	Ground Floor - Right Wing
8	Finance Team	Accounts Manager	Joseph Amalraj A	\N	118	Active	2026-07-06 10:29:12.100982	Ground Floor - Right Wing
9	Finance Team	Asst.Manager Accounts	Dilli Babu R	\N	119	Active	2026-07-06 10:29:12.100982	Ground Floor - Right Wing
10	HR Team	HR Executive	Hari	\N	120	Active	2026-07-06 10:29:12.100982	Ground Floor - Right Wing
11	Billing	Production Manager	Mehalinga Kumar	\N	145	Active	2026-07-06 10:29:12.100983	Ground Floor - Right Wing
12	Qbend & Media Team	Software Developer	Harini / Charuthi	\N	144	Active	2026-07-06 10:29:12.100983	Ground Floor - Right Wing
13	Qbend & Media Team	Accessibility Engineer	Gayathiri / Sindhu	\N	142	Active	2026-07-06 10:29:12.100983	Ground Floor - Right Wing
14	Qbend & Media Team	Trainee Software Developer	Ashwin / Rosy	\N	141	Active	2026-07-06 10:29:12.100983	Ground Floor - Right Wing
15	Qbend & Media Team	Trainee Software Developer	Salomi Ricy / Jayashree	\N	140	Active	2026-07-06 10:29:12.100984	Ground Floor - Right Wing
16	Qbend & Media Team	General Manager	Sakthivel V	\N	126	Active	2026-07-06 10:29:12.100984	Ground Floor - Right Wing
17	Qbend & Media Team	Software Developer	Yogeshwari	\N	147	Active	2026-07-06 10:29:12.100984	Ground Floor - Right Wing
18	Qbend & Media Team	Software Developer	Kanimozhi	\N	146	Active	2026-07-06 10:29:12.100984	Ground Floor - Right Wing
19	Qbend & Media Team	Associate Software Engineer	Shankar	\N	143	Active	2026-07-06 10:29:12.100985	Ground Floor - Right Wing
20	Editorial Team	GM - Editorial/Manager Automation	Muthukumar/Murali	\N	121	Active	2026-07-06 10:29:12.100985	Ground Floor - Right Wing
21	Editorial Team	Team Leader	Sangeetha A	\N	130	Active	2026-07-06 10:29:12.100985	Ground Floor - Right Wing
22	Editorial Team	Technical Editor	Manikaraj	\N	131	Active	2026-07-06 10:29:12.100985	Ground Floor - Right Wing
23	Editorial Team	Senior Team Leader	Vigneshwaramoorthy S	\N	134	Active	2026-07-06 10:29:12.100985	Ground Floor - Right Wing
24	Editorial Team	Dy. Manager	Srinivasan	\N	135	Active	2026-07-06 10:29:12.100986	Ground Floor - Right Wing
25	Editorial Team	Manager - Indexing Services	Umasangeetha	\N	137	Active	2026-07-06 10:29:12.100986	Ground Floor - Right Wing
26	IT Team	System Admin	Sulthan	\N	132	Active	2026-07-06 10:29:12.100986	Ground Floor - Right Wing
27	IT Team	IT Team	IT Support	\N	133	Active	2026-07-06 10:29:12.100986	Ground Floor - Right Wing
28	Accessible / Data Team	Senior Manager / Team Lead	Saravanan E / Amutha	\N	113	Active	2026-07-06 10:29:12.100987	Ground Floor - Left Wing
30	Accessible / Data Team	Business Development Manager	Muralidharan P	\N	115	Active	2026-07-06 10:29:12.100987	Ground Floor - Left Wing
31	Conference Room	Conference Room	Conference Room	\N	117	Active	2026-07-06 10:29:12.100987	Ground Floor - Left Wing
32	WK/Tech Team	Account Manager	Ravindran	\N	151	Active	2026-07-06 10:29:12.100988	First Floor - Old Space
33	WK/Tech Team	Senior Compositor	Raj Sekar	\N	152	Active	2026-07-06 10:29:12.100988	First Floor - Old Space
34	WK/Tech Team	Sr.Project Manager	Udhayakumar M M	\N	153	Active	2026-07-06 10:29:12.100988	First Floor - Old Space
35	WK/Tech Team	Production Manager - Composition	Parthasarathy G	\N	154	Active	2026-07-06 10:29:12.100988	First Floor - Old Space
36	Project Management Team	AGM-Project Management Services	Ann Mary Francis	\N	160	Active	2026-07-06 10:29:12.100988	First Floor - Old Space
37	Project Management Team	Senior Account Manager / Team Lead	Bharathi Sanjeev / Shyam	\N	155	Active	2026-07-06 10:29:12.100989	First Floor - Old Space
38	Project Management Team	Senior Project Manager	Annie Christine / Veerakumar	\N	156	Active	2026-07-06 10:29:12.100989	First Floor - Old Space
39	Project Management Team	PPD Team	Gowri / Anbazhagan	\N	157	Active	2026-07-06 10:29:12.100989	First Floor - Old Space
40	Project Management Team	Sr.Account Manager / Project Manager	Nandini / John	\N	159	Active	2026-07-06 10:29:12.100989	First Floor - Old Space
41	Project Management Team	Account Manager / Project Manager	Latha / Revathi	\N	158	Active	2026-07-06 10:29:12.10099	First Floor - Old Space
42	Project Management Team	Account Manager	Bhavani	\N	162	Active	2026-07-06 10:29:12.10099	First Floor - Old Space
43	WKH Team	Quality Controller	Gokula Sri / Sarathy	\N	180	Active	2026-07-06 10:29:12.10099	First Floor - New Space
44	WKH Team	Compositor	Saranya / Alvin	\N	179	Active	2026-07-06 10:29:12.10099	First Floor - New Space
45	WKH Team	Compositor / Team Lead	Iyyappan / Karuna	\N	177	Active	2026-07-06 10:29:12.10099	First Floor - New Space
46	WKH Team	Senior Quality Controller	Ganesh / Venkat	\N	178	Active	2026-07-06 10:29:12.100991	First Floor - New Space
47	JBL Team	Lead - Design / Team Lead - Comp	Mathan / Sathiya	\N	175	Active	2026-07-06 10:29:12.100991	First Floor - New Space
48	JBL Team	Production Manager	Vinoth	\N	186	Active	2026-07-06 10:29:12.100991	First Floor - New Space
49	JBL Team	Sr.Compositor / Compositor	Arputharaj / Anitha	\N	176	Active	2026-07-06 10:29:12.100991	First Floor - New Space
50	JBL Team	Quality Controller	Amudha / Kowsalya	\N	174	Active	2026-07-06 10:29:12.100992	First Floor - New Space
51	ART Team	Graphic Designer / Quality Lead	Samson / Barani	\N	171	Active	2026-07-06 10:29:12.100992	First Floor - New Space
52	ART Team	Graphic Designer	Elakiya / Sumesh Raj	\N	173	Active	2026-07-06 10:29:12.100992	First Floor - New Space
53	ART Team	Graphic Designer	Praveen	\N	172	Active	2026-07-06 10:29:12.100992	First Floor - New Space
29	Accessible / Data Team	Automation Specialist / Conversition	Ilayaraja P / Gopi	\N	114	Active	2026-07-06 10:29:12.100987	Ground Floor - Left Wing
5	Administration	Front Office	Reception	\N	111/112	Active	2026-07-06 10:29:12.100981	Ground Floor - Right Wing
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, company_email, password_hash, role_id, team_id, access_level, status, is_active, created_at, updated_at, last_login) FROM stdin;
22	Gopalakrishnan S	Gopalakrishnan@s4carlisle.com	Gopalakrishnan@s4carlisle.com	scrypt:32768:8:1$2zzSrOr4VOY1yPeX$8eb61cc1165fa335c9b0999e6b283b477aa3f486ae392eb31942c6ff0fe27747973b4fd9808fb6143bb04c9595d5cd59a84f8037b17ec5881c0ed3e5ef4ed8cf	33	2	manager	active	t	2026-07-21 09:27:11.582876	2026-07-21 09:27:11.582878	\N
4	Srinaath Kris	srinaath@s4carlisle.com	srinaath@s4carlisle.com	scrypt:32768:8:1$6ea9DGL9XsjfAuoF$2bd6e959932d4664cac86d3cb27e449ea058c6c4adfa7826ec7b96494e3e2a217f98059d46888a779abbb495a3511c076b358a65801841cb8db65506aa561ce9	3	3	manager	active	t	2026-07-21 07:01:17.333358	2026-07-21 07:01:17.333361	\N
6	Umasangeetha P	UmasangeethaP@s4carlisle.com	UmasangeethaP@s4carlisle.com	scrypt:32768:8:1$ZixLdkPRBJONftUn$273edad9cf1940fd147f92b5ed426f9d2871aec3cc9d257b1184410452658ad5c7ed43040d06b7554bba713d993260b3e4ae50095706ee32f9c178e4722f4d8c	18	2	manager	active	t	2026-07-21 09:27:10.451096	2026-07-21 09:27:10.451099	\N
7	Aravind K	aravindk@s4carlisle.com	aravindk@s4carlisle.com	scrypt:32768:8:1$m8DWuTYywohsPcpw$283f11e75c70a228199d4e9ab4efb15ca92224b8c20842048563419553668efa20eac5000b07143f10640ec26d2cc901f8e2673088c95bcc694495357fd24a86	19	2	manager	active	t	2026-07-21 09:27:10.535058	2026-07-21 09:27:10.53506	\N
9	Annapurna B	annapurnav@s4carlisle.com	annapurnav@s4carlisle.com	scrypt:32768:8:1$Qq5nr9o1zczx1iAH$f2d4529191ebfa4fbcaf5481d5902220c36f231f8dad32aa5e22e374b31678fd1640cfa8137e40dd26f66abe3a59231860c61bccf843e82a3069b2f3851f3221	21	2	user	active	t	2026-07-21 09:27:10.675831	2026-07-21 09:27:10.675833	\N
10	Lavanya V	avanyav@s4carlisle.com	avanyav@s4carlisle.com	scrypt:32768:8:1$D5YyhGGrJkCxKaRC$34666e9262d0206618ac1225a5c24ddba5e11cf5931958859860ae5f71d77707b68aabd799f46f8d15339397fcf914cb3b52feb3e045932a990f50d56a14ddf3	22	2	user	active	t	2026-07-21 09:27:10.747035	2026-07-21 09:27:10.747037	\N
12	Priyavarthini M	priyavarthini@s4carlisle.com	priyavarthini@s4carlisle.com	scrypt:32768:8:1$N7ntDt6WbORxLCsz$979784f8b973ca34cedc45d1232d433ebb27b48745ccd6d1bf6f9e0fdf295a458f0683cd063508afad79e94dad93f470542de66334c9ecb34fdc91dd6971f50f	25	2	user	active	t	2026-07-21 09:27:10.885221	2026-07-21 09:27:10.885224	\N
13	Mahalakshmi G	mahalakshmig@s4carlisle.com	mahalakshmig@s4carlisle.com	scrypt:32768:8:1$unKt5KJal97jMq0D$c94884c80bebcd9ba2620121969dc84de0e2a10ed4758fc364899b6d90be575b0a65870055a56d6b47af837dd1cec0b0dbc48b5ff21acf559b5dda3534ecfef2	19	2	manager	active	t	2026-07-21 09:27:10.954732	2026-07-21 09:27:10.954734	\N
14	Anand Jayaram	anandjayaram07@gmail.com	anandjayaram07@gmail.com	scrypt:32768:8:1$4eK2w63awPN7hhYi$05c3bf8ab7cd4cffa4e05c1e9977c307fff59b6b53a6b1d0b7e0e074286d22fc7f5a53c9a00f71b61915edc00073408acf394eba16fce872bf321fe7c455b356	26	2	user	active	t	2026-07-21 09:27:11.023878	2026-07-21 09:27:11.02388	\N
15	Janardhan Chirumavilla	janardhanr@s4carlisle.com	janardhanr@s4carlisle.com	scrypt:32768:8:1$wFdwm34gJRfkYu76$9f1176671bbdce2a3eafc1b52d49c792b95dc5569a6aae7f4d1447d16fc9026f3819d63ef95b40bcb09cfbd817088e42f46ee83e606cc9ba1cfbb05b627cdea6	27	2	user	active	t	2026-07-21 09:27:11.093151	2026-07-21 09:27:11.093153	\N
16	Srinivasan R	SrinivasanR@s4carlisle.com	SrinivasanR@s4carlisle.com	scrypt:32768:8:1$WHLRcsv8RLIPE8z4$36b56fe429dbb86853c87a3ae157abde6bf3d7d8f64c87ee17b8c5b551d3b7698e6aec9b7aed801fc12b7e9f54d6329c1fbbcc89d8526301fb2b09b3da67558e	28	2	manager	active	t	2026-07-21 09:27:11.16353	2026-07-21 09:27:11.163532	\N
17	Rajavalli Selvaraj	rajavallis@s4carlisle.com	rajavallis@s4carlisle.com	scrypt:32768:8:1$8kzeqAJk07XlFSkf$790c0b0169762b0192111701dc016efeae070a7719cf0b5cdacbe470ac58b6075175e924382ec64c9f332f14aa29b11e2f6498c4d06eb79090b79ea35d841805	29	2	user	active	t	2026-07-21 09:27:11.235463	2026-07-21 09:27:11.235465	\N
18	Shalini Bakthavatchalam	ShaliniB@s4carlisle.com	ShaliniB@s4carlisle.com	scrypt:32768:8:1$1bn3sle9R2CbLGKI$863fe6ff068f5a604c681c27046bba63b267b202eb08922da4edb63cc406f7645a9683e591a50fee9e40671d07a2482f5c34cadadfaa13eb34717c63619cdc12	30	2	user	active	t	2026-07-21 09:27:11.30531	2026-07-21 09:27:11.305312	\N
19	Gowsalya M	gowsalyam@s4carlisle.com	gowsalyam@s4carlisle.com	scrypt:32768:8:1$wqGNhUV46zkDdwf8$8e37ef5703ee28c55ef80fce4b137d40f9820a80951d84befa4003e27744c03ff4d66439b70b6c430025013c9b359d1e65f8cab850c994a7effc20c2dea93e68	29	2	user	active	t	2026-07-21 09:27:11.374276	2026-07-21 09:27:11.374279	\N
20	Gurunathan R	gurunathanr@s4carlisle.com	gurunathanr@s4carlisle.com	scrypt:32768:8:1$OIeT5G4KZZeae6rE$7b411f53ad465a0b04dee81a176a83e36e98c6b6afd632eb89c159484eab2ee25248b81820102d1cacfa94b643f5160163c4151ecad3b79310312d0cc7bb5b87	31	2	manager	active	t	2026-07-21 09:27:11.4433	2026-07-21 09:27:11.443302	\N
21	Sujatha S	sujathas@s4carlisle.com	sujathas@s4carlisle.com	scrypt:32768:8:1$xYRq56mAW5y9oNM4$311672f3a695d65bca23873af933e1d8c41620e69370b98ad14c892e3f3f6f8ddb65f07a925ead26eff67b432b089667d1062c8728c957627318a6d439a1c625	32	2	manager	active	t	2026-07-21 09:27:11.513468	2026-07-21 09:27:11.513471	\N
23	Chandra Kumar C	chandrakumarc@s4carlisle.com	chandrakumarc@s4carlisle.com	scrypt:32768:8:1$0Z45PveQyAjDS3fV$d0e131400a34982f4f5cb57d8e48f48c97dee5880fbb7d09b9faf52e74970d68001badd3ab3880d656a05a30da13d203151164891fcc3f22196ab8d3ae118f09	29	2	user	active	t	2026-07-21 09:27:11.652082	2026-07-21 09:27:11.652084	\N
25	Anbarasan K	anbarasank@s4carlisle.com	anbarasank@s4carlisle.com	scrypt:32768:8:1$363uUanIBjk94uyM$e6114bf44d54db5e8c1e963065a2428cca4cfe1043f80054731bab2820367b6689619b601ffba080eee8dbf07e7445928df9b9f81c4cfbc844e6846c96012bfd	29	2	user	active	t	2026-07-21 09:27:11.794	2026-07-21 09:27:11.794002	\N
26	Saranya Kamaraj	saranyak@s4carlisle.com	saranyak@s4carlisle.com	scrypt:32768:8:1$1JUuSvRvHs9SukyW$520587ec102b6941eff134283488127b112a0d97e8902350d7ade32c4ad52454c7879bfc325766c5a0e35cf9fd67789f25b7a94c480c179ec893ca0de6081d40	29	2	user	active	t	2026-07-21 09:27:11.866577	2026-07-21 09:27:11.86658	\N
27	Shalom Kumar Sigworth	shalomkumars@s4carlisle.com	shalomkumars@s4carlisle.com	scrypt:32768:8:1$jK6crUFPoWhiEEBb$40ae271e459871701085dbf73718dd31df10e9741d3134cefd8291c39141469dafa8dfb3ae3318585baaf29c12add780c2988a7bd9fcca618f41c17a106b3ac3	35	2	manager	active	t	2026-07-21 09:27:11.939414	2026-07-21 09:27:11.939417	\N
28	Prakash B	prakashb@s4carlisle.com	prakashb@s4carlisle.com	scrypt:32768:8:1$UhapJ5GuQiZF3uQU$3ee6bcf886b2220fdf4b2f406ccac4d23c43de54202e1a4b729a95c9c6a65f14c6c0062d6d7ae40b40dd82f085606263c2eb379f8064dd2592361e348f44a3f3	36	2	user	active	t	2026-07-21 09:27:12.012044	2026-07-21 09:27:12.012046	\N
24	Sangeetha A	sangeethaa@s4carlisle.com	sangeethaa@s4carlisle.com	scrypt:32768:8:1$bnSMpQnNqVRNKiho$3ac4d8aa94aa18c797f6995791f2e29be12b2d662ccccc877ddb22a11e273867332e2a0938d5f353f0723e8a3e82d1e30da1825a6b3650a419d226c76849cb1b	34	2	user	active	t	2026-07-21 09:27:11.721669	2026-07-22 04:06:04.766634	2026-07-22 09:36:04.766241
11	Madhu Malini N S	MadhuMN@s4carlisle.com	MadhuMN@s4carlisle.com	scrypt:32768:8:1$85N69ZCFUidtPHgw$fc4a95ec02c3fdc044f6f66ff92ea162ec0c38c900d4841e3b8df31554aa61613aa81b304fc3ee6604d7424e0c33963228f0a598f2680640c0507033b1e7c6a4	24	2	manager	active	t	2026-07-21 09:27:10.816602	2026-07-22 04:06:38.716843	2026-07-22 09:36:38.716518
5	Muthukumar S	MuthukumarS@s4carlisle.com	MuthukumarS@s4carlisle.com	scrypt:32768:8:1$4HwkwJHln40RJ4gh$4f769c8cfc41a29ef164f897c313203a613d6482f2246e38dbcfb7a39c200a2f94420eb8d3e0a2102ff6fb3cc05727ea410d76cfa4d4d5903e8429139702dc67	23	2	manager	active	t	2026-07-21 07:16:34.459097	2026-07-22 04:07:46.977336	2026-07-22 09:37:46.97695
29	Supriya Subramanian	supriyas@s4carlisle.com	supriyas@s4carlisle.com	scrypt:32768:8:1$xSsZWd2FlSwv9kav$8848a2a7c908f1ed04ca5d0d051cde8b0f3800b22ea9357572f60cbb48a70e41ad2ee7e5a357249ddfa01746f8cb7a4762b4648c153493b3f0b5aac5ca6b7788	37	2	manager	active	t	2026-07-21 09:27:12.088063	2026-07-21 09:27:12.088065	\N
30	JUDE RAEYMOND J	juderaeymondj@s4carlisle.com	juderaeymondj@s4carlisle.com	scrypt:32768:8:1$nuPLWgcHF6utg4ol$0dae04835ac1b887ec8a1a8968075e89298d995763e70add977ab518e6b9388e15bbd376d07758c72be7218ff968db13c48bc7ac2d49cab6b428920163de6c16	38	2	user	active	t	2026-07-21 09:27:12.162887	2026-07-21 09:27:12.16289	\N
31	Sumathi R	sumathir@s4carlisle.com	sumathir@s4carlisle.com	scrypt:32768:8:1$ZILJxUrCOBWR4UT4$c20bf33876c38722a2b56c2b17c37bad041177db032c35bbfbcb2e1c8f4ef5c3db75d5eba90f0ff62511c1d58788862f950a263a0a0f3aa0f5321cb8ef5516f3	39	2	manager	active	t	2026-07-21 09:27:12.235182	2026-07-21 09:27:12.235185	\N
32	Vigneshwar amoorthy S	vigneshm@s4carlisle.com	vigneshm@s4carlisle.com	scrypt:32768:8:1$V7xBijKfr35PDCHj$b1283968f0f5f0f83bbdd57b7a751f60580bcb1a583788366631985cd17427468f48eda74283bc05378b2e851839d8533e601ab2b8336070a4556de9039a336c	40	2	user	active	t	2026-07-21 09:27:12.30796	2026-07-21 09:27:12.307963	\N
33	Manikaraj T	manickarajt@s4carlisle.com	manickarajt@s4carlisle.com	scrypt:32768:8:1$oCxLddJePVE3rqkE$f37e1b2ea45c664d1a48b4a274e24e56d3bd82bfa6d297289f0f9e3902a1eff7e5d5e62a6f5352edd5e523b9cd834035eedf46ed1b6ec2d70d1e58135d56ab0b	41	2	user	active	t	2026-07-21 09:27:12.381649	2026-07-21 09:27:12.381652	\N
34	Nivetha M	nivetham@s4carlisle.com	nivetham@s4carlisle.com	scrypt:32768:8:1$43OfSPKP6b0dpdMY$72c2460d0e29e45cf637c7512f4521f4b6e74a44d8e4fab21899578d84470e06ea923029a5c4a051b3b33b706c35c3f7a41776e690f1378b5beb42bc1b5b4b7f	42	2	user	active	t	2026-07-21 09:27:12.454343	2026-07-21 09:27:12.454346	\N
35	Patrick Nithyan	patricknithyanp@s4carlisle.com	patricknithyanp@s4carlisle.com	scrypt:32768:8:1$UXK2Xe2O6dzmuH7F$6f5c51b17eb07ed8fc9788ae94b5b33c16ab0a82306aeb7551e2f164f26a2d20b1c057674fe253c4b2253acd7a5b5abc7dc1ec80474cf5669b6c01417787b5bc	41	2	user	active	t	2026-07-21 09:27:12.527431	2026-07-21 09:27:12.527433	\N
37	Selva Bharath P	selvabharathp@s4carlisle.com	selvabharathp@s4carlisle.com	scrypt:32768:8:1$2A1BHihrvmp0ywtw$1f0dca659453b67b57d5cedafd558398490953168f2cce25da1b1fb78723cba6307edd7072aa1d8167398057293bc9b3b459adc53d2e2592b9769eb1bd17afc3	45	4	user	active	t	2026-07-21 09:27:12.670686	2026-07-21 09:27:12.670688	\N
38	Nirmal Kumar R	nirmalkumarr@s4carlisle.com	nirmalkumarr@s4carlisle.com	scrypt:32768:8:1$BJbH5ixRKZFCOypW$cfaa0d591a301f74aedebf5d5f2a897c4195bb59ef51ed0bd6a0522257f40663db3d2a8304211f7128efdd7018b25bfdf383b06052a326709a5a31047c91bf4e	41	2	user	active	t	2026-07-21 09:27:12.74139	2026-07-21 09:27:12.741393	\N
39	Saranya R	saranyar@s4carlisle.com	saranyar@s4carlisle.com	scrypt:32768:8:1$bxbs1njaPk2ZXPzT$403d8dd4e30a268f651d4186479988bf40f74d992c0ad512c867e19a5365c22c659a56a9bfffb5d3701c82c854b56bbd8b71a45e4109a41e0761ceaf83842eaa	22	2	user	active	t	2026-07-21 09:27:12.810937	2026-07-21 09:27:12.810939	\N
40	Viswanathan K	viswanathank@s4carlisle.com	viswanathank@s4carlisle.com	scrypt:32768:8:1$nUoqnvw5N4pGiC1a$24bbbf33d164ad10bb011303979aa299b2f3dfb7f1c6c173597ae26d83984d9e7fadbeb286a39d6714365d84957a47d26f0f21a27bc8fcc2b338e06690d4a1e9	41	2	user	active	t	2026-07-21 09:27:12.88074	2026-07-21 09:27:12.880742	\N
41	Bhami M	bhamim@s4carlisle.com	bhamim@s4carlisle.com	scrypt:32768:8:1$VnDI7AeEQbUWaKTW$9547ff918331a8394980b0f758057270ee3f0a41d9212a23430b82177997dcaf376afe3f4e2f5d8ec844965a451f7527ced8d61a4490e238f063f40e4656be2e	46	2	user	active	t	2026-07-21 09:27:12.953849	2026-07-21 09:27:12.953852	\N
42	Ramya T	ramyat@s4carlisle.com	ramyat@s4carlisle.com	scrypt:32768:8:1$6x62kCxN7RMm1PAp$a184b466bd2cd6801ad08a8810dc8b43da76caabcfbec835250ca1e713e079448bf6baa4348ebddd05a5006067cac135ba6445ac89b8a1efe8176db0a541cfb0	22	2	user	active	t	2026-07-21 09:27:13.026145	2026-07-21 09:27:13.026148	\N
43	Shaonli Deb D	shaonlideb@s4carlisle.com	shaonlideb@s4carlisle.com	scrypt:32768:8:1$8LgsFQoW70YDMf2w$ebb19d0cbb9ecfd8e7a42ee7ed40afcf2e6996830b95625519bb839149c630f662d526ee9577a807b5e7505a3b8edebe844faaefe89c0a9e1cbf4e55dc4a60c6	39	2	user	active	t	2026-07-21 09:27:13.096805	2026-07-21 09:27:13.096812	\N
44	ARUN S	aruns@s4carlisle.com	aruns@s4carlisle.com	scrypt:32768:8:1$pJXrOCr6Vw7CRSoR$0ab4208d8348c570f4c66d4051354ab36936c861b02b4585bc3331f2bd65d50733f05aff43a7ffbbe1b6210b1e769ad1a058e595f4a638fa617645f56ebf100b	47	5	user	active	t	2026-07-21 09:29:41.316617	2026-07-21 09:29:41.316621	\N
45	ASHWIN R S	ashwinr@s4carlisle.com	ashwinr@s4carlisle.com	scrypt:32768:8:1$NFHh0IyqXa7bCYCe$dbbe54a89385cf46ef98273ecd2b94ce12a6b614e516b0c93de2e2a0ebb61718adc792d1bb2cc5c4aab81ad70d69f47742c4caf48b0c7d6d22e51d9be363d19b	47	5	user	active	t	2026-07-21 09:29:41.390401	2026-07-21 09:29:41.390403	\N
46	CHARUTHI V	charuthiv@s4carlisle.com	charuthiv@s4carlisle.com	scrypt:32768:8:1$qvTC6oLcWHL12lt1$43dd4a70e3e3562ec35ee7c0da49facf209dab1b8de767a684438ff24b41468dc7251d4c61c8565f933518a3f3ae505269df918e3640d4f5b4890163f7a92b0c	47	5	user	active	t	2026-07-21 09:29:41.460912	2026-07-21 09:29:41.460915	\N
47	DEETI CHANDRA D	deeptichandrad@s4carlisle.com	deeptichandrad@s4carlisle.com	scrypt:32768:8:1$bFJl6PpxLPLzVdrq$4c2cdefc2e50e84a353ecb4de059aa8f7cb87b7a2b2047805c1d2058513cddfae42f7dade65118ce8e37dc28d1dd119f94349d02c4577d784bbf4bbf9ccafa79	48	5	user	active	t	2026-07-21 09:29:41.529788	2026-07-21 09:29:41.529791	\N
48	DEEPAK V	deepakv@s4carlisle.com	deepakv@s4carlisle.com	scrypt:32768:8:1$BNZuDyXg4kuLF6uL$dee00ef4e0144999aa836cecd8b8965c107788abfb41ea56d077b3096eaf3c2f0f3988d2e055ed9377017112db508409773f3bc2155cd7b50baef760be534342	47	5	user	active	t	2026-07-21 09:29:41.598464	2026-07-21 09:29:41.598466	\N
49	Sindhu G	govadasindhug@s4carlisle.com	govadasindhug@s4carlisle.com	scrypt:32768:8:1$XbwTv8oa9IkCjeAC$4d287372689ef616816c2a9233d470f9c5690b4de1402fc70c532a4245a76bd43fd9dd8cba1e62d00902ae5a02fbea6ba07cac516b185d9b57d0a72dd3c91c2a	48	5	user	active	t	2026-07-21 09:29:41.668215	2026-07-21 09:29:41.668216	\N
50	HARINI K R	harinik@s4carlisle.com	harinik@s4carlisle.com	scrypt:32768:8:1$fK6YV4eCjgrW0XAU$bfad37142a656e4ab9d9ce60ba5e4077bd952ff84f7b70825fc08d808376452681b0ebccfd81193c4645e68b232370eb615537b01e0a37780d587673f52bf847	49	5	user	active	t	2026-07-21 09:29:41.73674	2026-07-21 09:29:41.736742	\N
51	ROSY B	rosybalaraman@s4carlisle.com	rosybalaraman@s4carlisle.com	scrypt:32768:8:1$zBhHiRChGcHjG4WC$3018116e8d7733b7570478958eca21e7f668958afea6d22331404b474311cf77b1eab75457a69883397b6dd9a4346d277580bdc3da8fb7ba84d3d883e6d8b986	47	5	user	active	t	2026-07-21 09:29:41.805525	2026-07-21 09:29:41.805527	\N
52	JAYASHREE S	jayashrees@s4carlisle.com	jayashrees@s4carlisle.com	scrypt:32768:8:1$TsYPKw0BGWdJRckm$cf7f026746535953fd08a3f56fc45a02f41e83063e5a76eea12b5a2b662f47084cadb59764fda8002fbc51ad74f5fa8b6385078b9f2968afbbc67221104625f6	47	5	user	active	t	2026-07-21 09:29:41.87504	2026-07-21 09:29:41.875043	\N
53	SALOMI RICY AMIRDHA S	salomiricya@s4carlisle.com	salomiricya@s4carlisle.com	scrypt:32768:8:1$OMM0WBeatZg2jD9t$280b112999406d4038b91937c3f7eb6b9364489a9b4fe2e82881976c0d597f87d586ee6588015c1cd7cc9a879b31dc6debd4949d574497b737d2d4d35b8cda37	47	5	user	active	t	2026-07-21 09:29:41.943354	2026-07-21 09:29:41.943357	\N
54	SHREE VARSHINE K	shreevarshniek@s4carlisle.com	shreevarshniek@s4carlisle.com	scrypt:32768:8:1$bMu5kiWDcCQThO4y$fdf6b8af11b72f5c044ac6be7670077b4613ab7bb9b8bbc7cb185ad74ec15c5dc1ee41e9c67d56b7bf4ca0f002f58c87ee6dab466ef33e13ce0115bfa78030a4	47	5	user	active	t	2026-07-21 09:29:42.012095	2026-07-21 09:29:42.012097	\N
55	GAYATRI V	gayathriv@s4carlisle.com	gayathriv@s4carlisle.com	scrypt:32768:8:1$sWmDQSSYSuAMuxST$f44235683dfc5b4e9c198fd0146ba8efbfcb78baab5c9e19384de0e4dbb06a779a379c9017dc62a4bd10052c76ef58de3e77f181bbedde36849967900c79159f	48	5	user	active	t	2026-07-21 09:29:42.080271	2026-07-21 09:29:42.080273	\N
1	HR Admin	hr_admin@peoplehub.com	hr_admin@peoplehub.com	scrypt:32768:8:1$OrSz77UpYgPRSDZd$7fda693b3c9d0960fb8c3ab38334f0115709e16746f06b4d359a1c31edb67122ccf579ba88879f0877f3adcd75d6492a457bbb23ff03bf3a447ee0b7f10cdd27	1	1	admin	active	t	2026-07-21 04:41:09.979225	2026-07-21 12:13:35.30814	2026-07-21 12:13:35.305941
36	Hemamalini K	hemamalinik@s4carlisle.com	hemamalinik@s4carlisle.com	scrypt:32768:8:1$sLTt4hnKEMLRBO2Q$720aaaac28d5e4eb652e8a9e7b4f2787d4f602b936762c38ce92e044afb54923c376a0beb8d198bf18ed93bdea53e3193cebda4de29738247a93ec2f6bd49114	44	4	user	active	t	2026-07-21 09:27:12.597989	2026-07-22 04:07:02.446518	2026-07-22 09:37:02.446257
8	Murali B	muraliba@s4carlisle.com	muraliba@s4carlisle.com	scrypt:32768:8:1$JPEc4CTaAmdSGIno$88ffe9e915f3a03e370f4efaac03bfbd7e1cbaa460f645211c5c1e4892d3a8eb64c01d1562137cabe9492790a068f0b4638c1869bfe8975b9d95753eb52071fe	20	2	manager	active	t	2026-07-21 09:27:10.606738	2026-07-22 04:23:10.765847	2026-07-22 09:53:10.765357
\.


--
-- Name: appraisal_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appraisal_answers_id_seq', 1, false);


--
-- Name: appraisal_cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appraisal_cycles_id_seq', 1, false);


--
-- Name: appraisal_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appraisal_questions_id_seq', 1, false);


--
-- Name: appraisal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appraisal_requests_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 14, true);


--
-- Name: birthday_wishes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.birthday_wishes_id_seq', 1, true);


--
-- Name: communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.communications_id_seq', 3, true);


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_leave_balances_id_seq', 161, true);


--
-- Name: employee_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_notifications_id_seq', 174, true);


--
-- Name: employee_performance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_performance_id_seq', 1, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 53, true);


--
-- Name: holiday_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holiday_overrides_id_seq', 1, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 11, true);


--
-- Name: leave_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_audit_logs_id_seq', 1, false);


--
-- Name: leave_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_ledger_id_seq', 1, false);


--
-- Name: leave_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_policies_id_seq', 5, true);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 1, true);


--
-- Name: meeting_rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meeting_rooms_id_seq', 5, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 49, true);


--
-- Name: room_bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_bookings_id_seq', 1, false);


--
-- Name: shift_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_requests_id_seq', 1, true);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teams_id_seq', 5, true);


--
-- Name: telecom_directory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telecom_directory_id_seq', 53, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 55, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: appraisal_answers appraisal_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_answers
    ADD CONSTRAINT appraisal_answers_pkey PRIMARY KEY (id);


--
-- Name: appraisal_cycles appraisal_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_cycles
    ADD CONSTRAINT appraisal_cycles_pkey PRIMARY KEY (id);


--
-- Name: appraisal_questions appraisal_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_questions
    ADD CONSTRAINT appraisal_questions_pkey PRIMARY KEY (id);


--
-- Name: appraisal_requests appraisal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_requests
    ADD CONSTRAINT appraisal_requests_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: birthday_wishes birthday_wishes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birthday_wishes
    ADD CONSTRAINT birthday_wishes_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balances employee_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id);


--
-- Name: employee_notifications employee_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_notifications
    ADD CONSTRAINT employee_notifications_pkey PRIMARY KEY (id);


--
-- Name: employee_performance employee_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_performance
    ADD CONSTRAINT employee_performance_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: holiday_overrides holiday_overrides_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_overrides
    ADD CONSTRAINT holiday_overrides_date_key UNIQUE (date);


--
-- Name: holiday_overrides holiday_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_overrides
    ADD CONSTRAINT holiday_overrides_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_date_key UNIQUE (date);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: leave_audit_logs leave_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_audit_logs
    ADD CONSTRAINT leave_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: leave_ledger leave_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_ledger
    ADD CONSTRAINT leave_ledger_pkey PRIMARY KEY (id);


--
-- Name: leave_policies leave_policies_leave_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_leave_type_key UNIQUE (leave_type);


--
-- Name: leave_policies leave_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: meeting_rooms meeting_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: room_bookings room_bookings_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_bookings
    ADD CONSTRAINT room_bookings_booking_id_key UNIQUE (booking_id);


--
-- Name: room_bookings room_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_bookings
    ADD CONSTRAINT room_bookings_pkey PRIMARY KEY (id);


--
-- Name: shift_requests shift_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_requests
    ADD CONSTRAINT shift_requests_pkey PRIMARY KEY (id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: telecom_directory telecom_directory_extension_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telecom_directory
    ADD CONSTRAINT telecom_directory_extension_number_key UNIQUE (extension_number);


--
-- Name: telecom_directory telecom_directory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telecom_directory
    ADD CONSTRAINT telecom_directory_pkey PRIMARY KEY (id);


--
-- Name: users users_company_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_email_key UNIQUE (company_email);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appraisal_answers appraisal_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_answers
    ADD CONSTRAINT appraisal_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.appraisal_questions(id);


--
-- Name: appraisal_answers appraisal_answers_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_answers
    ADD CONSTRAINT appraisal_answers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.appraisal_requests(id);


--
-- Name: appraisal_requests appraisal_requests_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appraisal_requests
    ADD CONSTRAINT appraisal_requests_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.appraisal_cycles(id);


--
-- Name: birthday_wishes birthday_wishes_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birthday_wishes
    ADD CONSTRAINT birthday_wishes_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: birthday_wishes birthday_wishes_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birthday_wishes
    ADD CONSTRAINT birthday_wishes_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_leave_balances employee_leave_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees employees_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: roles roles_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: room_bookings room_bookings_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_bookings
    ADD CONSTRAINT room_bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.meeting_rooms(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: users users_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict bn9oDncvz3r1RrtBHdVcLwWyDkid1fFaEPDuHh43nanOAAf0fnOifcoxJg2rHq7

