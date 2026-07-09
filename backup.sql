--
-- PostgreSQL database dump
--

\restrict GYbecUUysVuKfhRmHQT7Roe6gjcIGJ871ceJjwdAm32BZ7kw603XdDwrCedUDtX

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    resource_type character varying(50),
    resource_id integer,
    details text,
    ip_address character varying(50),
    user_agent character varying(500),
    created_at timestamp without time zone
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


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
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    category character varying(100),
    client_type character varying(50),
    email character varying(300),
    website character varying(300),
    designation character varying(100),
    department character varying(100),
    division character varying(100),
    vendor_number character varying(50),
    address_line_1 character varying(500),
    address_line_2 character varying(500),
    country character varying(100),
    state character varying(100),
    city character varying(100),
    zip_code character varying(20),
    working_hours character varying(100),
    contact_hours character varying(100),
    sub_specialization character varying(200),
    status character varying(20),
    project_count integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


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
    created_at timestamp without time zone
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
-- Name: employee_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_notifications (
    id integer NOT NULL,
    receiver_name character varying(200) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean,
    created_at timestamp without time zone
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
    role character varying(100),
    joining_date date,
    reporting_manager character varying(100),
    salary double precision,
    sick_leave double precision,
    casual_leave double precision,
    earned_leave double precision,
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
-- Name: leave_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_ledger (
    id integer NOT NULL,
    employee_id character varying(50),
    month character varying(20),
    year integer,
    opening_cl double precision,
    opening_sl double precision,
    opening_el double precision,
    credit_cl double precision,
    credit_sl double precision,
    credit_el double precision,
    taken_cl double precision,
    taken_sl double precision,
    taken_el double precision,
    closing_cl double precision,
    closing_sl double precision,
    closing_el double precision
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
    permission_date date,
    from_time time without time zone,
    to_time time without time zone
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
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    notification_type character varying(50),
    is_read boolean,
    project_id integer,
    workflow_stage character varying(50),
    created_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


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
-- Name: project_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_assignments (
    id integer NOT NULL,
    project_id integer NOT NULL,
    assigned_user_id integer NOT NULL,
    workflow_stage character varying(50) NOT NULL,
    chapter_id integer,
    status character varying(20),
    priority character varying(20),
    assigned_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    comments text
);


ALTER TABLE public.project_assignments OWNER TO postgres;

--
-- Name: project_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_assignments_id_seq OWNER TO postgres;

--
-- Name: project_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_assignments_id_seq OWNED BY public.project_assignments.id;


--
-- Name: project_chapters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_chapters (
    id integer NOT NULL,
    project_id integer NOT NULL,
    chapter_number integer,
    chapter_title character varying(300),
    file_name character varying(300),
    file_path character varying(1000),
    file_size integer,
    status character varying(20),
    version integer,
    uploaded_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.project_chapters OWNER TO postgres;

--
-- Name: project_chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_chapters_id_seq OWNER TO postgres;

--
-- Name: project_chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_chapters_id_seq OWNED BY public.project_chapters.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    project_code character varying(100) NOT NULL,
    customer character varying(200),
    customer_name character varying(200),
    customer_contact character varying(100),
    division_code character varying(50),
    billing_location character varying(200),
    category character varying(100),
    sales_person character varying(200),
    project_title character varying(300) NOT NULL,
    priority character varying(20),
    complexity character varying(20),
    edition character varying(50),
    color character varying(20),
    trim_size character varying(50),
    copyright_year character varying(10),
    manuscript_pages integer,
    estimated_pages integer,
    actual_pages integer,
    isbn_number character varying(20),
    xml_standard character varying(50),
    workflow_id integer,
    current_stage character varying(50),
    status character varying(20),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    activated_at timestamp without time zone,
    completed_at timestamp without time zone,
    creator_id integer,
    client_id integer
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


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
-- Name: sla_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_tracking (
    id integer NOT NULL,
    project_id integer NOT NULL,
    workflow_stage character varying(50) NOT NULL,
    sla_deadline timestamp without time zone,
    actual_completion timestamp without time zone,
    is_overdue boolean,
    overdue_hours double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sla_tracking OWNER TO postgres;

--
-- Name: sla_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sla_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sla_tracking_id_seq OWNER TO postgres;

--
-- Name: sla_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sla_tracking_id_seq OWNED BY public.sla_tracking.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    workflow_stage character varying(50),
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
-- Name: workflow_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_history (
    id integer NOT NULL,
    project_id integer NOT NULL,
    from_stage character varying(50),
    to_stage character varying(50) NOT NULL,
    changed_by_user_id integer,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    duration_hours double precision,
    comments text
);


ALTER TABLE public.workflow_history OWNER TO postgres;

--
-- Name: workflow_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_history_id_seq OWNER TO postgres;

--
-- Name: workflow_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_history_id_seq OWNED BY public.workflow_history.id;


--
-- Name: workflow_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_stages (
    id integer NOT NULL,
    workflow_id integer NOT NULL,
    name character varying(100) NOT NULL,
    "order" integer NOT NULL,
    description text,
    sla_hours integer,
    required_role_id integer,
    is_active boolean
);


ALTER TABLE public.workflow_stages OWNER TO postgres;

--
-- Name: workflow_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflow_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflow_stages_id_seq OWNER TO postgres;

--
-- Name: workflow_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflow_stages_id_seq OWNED BY public.workflow_stages.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflows_id_seq OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: communications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications ALTER COLUMN id SET DEFAULT nextval('public.communications_id_seq'::regclass);


--
-- Name: employee_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_notifications ALTER COLUMN id SET DEFAULT nextval('public.employee_notifications_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: leave_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_ledger ALTER COLUMN id SET DEFAULT nextval('public.leave_ledger_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: meeting_rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms ALTER COLUMN id SET DEFAULT nextval('public.meeting_rooms_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: project_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments ALTER COLUMN id SET DEFAULT nextval('public.project_assignments_id_seq'::regclass);


--
-- Name: project_chapters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_chapters ALTER COLUMN id SET DEFAULT nextval('public.project_chapters_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


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
-- Name: sla_tracking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_tracking ALTER COLUMN id SET DEFAULT nextval('public.sla_tracking_id_seq'::regclass);


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
-- Name: workflow_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history ALTER COLUMN id SET DEFAULT nextval('public.workflow_history_id_seq'::regclass);


--
-- Name: workflow_stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_stages ALTER COLUMN id SET DEFAULT nextval('public.workflow_stages_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, user_id, check_in, check_out, lunch_break, lunch_start, lunch_end, lunch_minutes, tea_break, tea_start, tea_end, tea_minutes, total_break_minutes, total_hours, attendance_date, status, shift_timing, manager_status) FROM stdin;
2	2	2026-07-07 09:09:57.295309	2026-07-07 09:23:01.691888	f	\N	\N	0	f	\N	\N	0	0	0.22	2026-07-07	Present	General Shift	Pending
1	7	2026-07-06 17:41:59.401176	2026-07-06 17:42:03.652864	f	\N	\N	0	f	\N	\N	0	0	0	2026-07-06	Present	General Shift	Approved
3	4	2026-07-07 04:13:26.666837	2026-07-07 09:44:10.964336	f	\N	\N	0	f	\N	\N	0	0	5.51	2026-07-07	Present		Pending
4	3	2026-07-07 04:15:07.867066	2026-07-07 09:46:05.340673	f	\N	\N	0	f	\N	\N	0	0	5.52	2026-07-07	Present	Night Shift	Pending
5	37	2026-07-07 11:33:34.747672	2026-07-07 12:18:45.685943	f	2026-07-07 12:18:38.803931	2026-07-07 12:18:39.526551	0	f	\N	\N	0	0	0.75	2026-07-07	Present	General Shift	Pending
6	14	2026-07-07 12:16:00.353458	\N	f	2026-07-07 12:18:10.565332	2026-07-07 12:18:12.438939	0	f	2026-07-07 12:18:57.657605	2026-07-07 12:21:05.28853	2	2	0	2026-07-07	Present	General Shift	Pending
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, category, client_type, email, website, designation, department, division, vendor_number, address_line_1, address_line_2, country, state, city, zip_code, working_hours, contact_hours, sub_specialization, status, project_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.communications (id, employee_id, receiver_id, employee_name, message_type, title, target_role, message, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: employee_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_notifications (id, receiver_name, title, message, is_read, created_at) FROM stdin;
3	Admin	Missed Check In	Employee ID: EMP007 - Murali B logged in but has not checked in within 1 minute.	f	2026-07-07 03:40:39.422782
5	Project Manager	New Shift Request	User  submitted a shift request.	f	2026-07-07 04:13:16.038646
6	User 	Shift Request Approved	Your shift request has been approved.	f	2026-07-07 04:13:26.668764
7	Project Manager	New Shift Request	User  submitted a shift request.	f	2026-07-07 04:13:44.144184
8	User 	Shift Request Approved	Your shift request has been approved.	f	2026-07-07 04:14:03.336423
9	Admin	New Shift Request	Manager  submitted a shift request.	f	2026-07-07 04:14:31.413493
10	Manager 	Shift Request Approved	Your shift request has been approved.	f	2026-07-07 04:15:07.867865
12	Admin	Missed Check In	Employee ID: EMP006 - Aravind K logged in but has not checked in within 1 minute.	f	2026-07-07 05:33:14.902878
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, user_id, profile_image, employee_id, first_name, last_name, email, phone, alternate_phone, dob, gender, marital_status, blood_group, address, city, state, country, pincode, department, designation, role, joining_date, reporting_manager, salary, sick_leave, casual_leave, earned_leave, last_leave_reset_month, last_leave_reset_year, bank_name, account_number, ifsc_code, pan_number, aadhaar_number, qualification, college, passing_year, percentage, tenth_school, tenth_percentage, twelfth_school, twelfth_percentage, ug_degree, ug_college, ug_percentage, pg_degree, pg_college, pg_percentage, pf_number, uan_number, esi_number, tenth_board, twelfth_board, ug_university, pg_university, total_experience, previous_company, current_ctc, expected_ctc, notice_period, skills, employee_type, work_location, shift_timing, probation_end_date, resume_file, aadhaar_file, pan_file, degree_certificate, emergency_contact_name, emergency_contact_number, emergency_contact_relation, status, profile_completed, is_first_login, team_id, salary_paid, salary_paid_date) FROM stdin;
9	9	\N	EMP009	Lavanya	V	Lavanya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
10	10	\N	EMP010	Muthukumar	S	Muthukumar	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
12	12	\N	EMP012	Priyavarthini	M	Priyavarthini	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
13	13	\N	EMP013	Mahalakshmi	G	Mahalakshmi	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
14	14	\N	EMP014	Anand	Jayaram	Anand	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
15	15	\N	EMP015	Chirumavilla	Janardhan	Chirumavilla	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
16	16	\N	EMP016	Srinivasan	R	Srinivasan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
17	17	\N	EMP017	Rajavalli	Selvaraj	Rajavalli	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
18	18	\N	EMP018	Shalini	Bakthavatchalam	Shalini	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
19	19	\N	EMP019	Gowsalya	M	Gowsalya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
20	20	\N	EMP020	Gurunathan	R	Gurunathan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
21	21	\N	EMP021	Sujatha	S	Sujatha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
22	22	\N	EMP022	Gopalakrishnan	S	Gopalakrishnan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
23	23	\N	EMP023	Chandra	Kumar C	Chandra	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
24	24	\N	EMP024	Sangeetha	A	Sangeetha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
25	25	\N	EMP025	Anbarasan	K	Anbarasan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
26	26	\N	EMP026	Saranya	Kamaraj	Saranya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
27	27	\N	EMP027	Shalom	Kumar Sigworth	Shalom	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
28	28	\N	EMP028	Prakash	B	Prakash	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
29	29	\N	EMP029	Supriya	Subramanian	Supriya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
30	30	\N	EMP030	J	JUDE RAEYMOND	J	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
31	31	\N	EMP031	Sumathi	R	Sumathi	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
32	32	\N	EMP032	Vigneshwar	amoorthy S	Vigneshwar	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
33	33	\N	EMP033	Manikaraj	T	Manikaraj	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
34	34	\N	EMP034	Nivetha	M	Nivetha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
35	35	\N	EMP035	Patrick	Nithyan	Patrick	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
36	36	\N	EMP036	Hemamalini		Hemamalini	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
38	38	\N	EMP038	Nirmal	Kumar	Nirmal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
39	39	\N	EMP039	Viswanathan	K	Viswanathan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	f	\N
7	7	\N	EMP007	Murali	B	Murali	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:01:12.382201
11	11	\N	EMP011	Madhu	Malini N S	Madhu	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:01:16.251306
1	1	\N	EMP001	Admin		admin@wms.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Administration	Administrator	Admin	2026-07-06		25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:01:26.318892
2	2	\N	EMP002	HR	Manager	hr@wms.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Human Resources	HR Manager	Hr	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:02:25.00321
8	8	\N	EMP008	Annapurna	B	Annapurna	7708484034	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Editorial Team	Copyeditor	2011-04-01	Admin 	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Absent	t	f	2	f	\N
4	4	\N	EMP004	User		user@wms.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Employee	User	2026-07-06	Project Manager	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:04:22.628472
5	5	\N	EMP005	Umasangeetha	P	Umasangeetha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:04:28.465205
6	6	\N	EMP006	Aravind	K	Aravind	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:06:00.460179
3	3	\N	EMP003	Manager		manager@wms.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Production	Project Manager	Manager	2026-07-06	Admin	25000	0	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Active	f	t	\N	t	2026-07-06 16:02:28.772224
37	37	\N	EMP037	Selva	Bharath P	Selva@gmail.com	83648965874	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Editorial Team	Editorial Team	Technical Editor	2026-07-07	Murali B	25000	1.5	1.5	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	General Shift	\N	\N	\N	\N	\N	\N	\N	\N	Absent	t	f	2	f	\N
\.


--
-- Data for Name: leave_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_ledger (id, employee_id, month, year, opening_cl, opening_sl, opening_el, credit_cl, credit_sl, credit_el, taken_cl, taken_sl, taken_el, closing_cl, closing_sl, closing_el) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, employee_id, employee_name, leave_type, from_date, to_date, total_days, reporting_manager, handover_to, emergency_contact, reason, status, request_type, permission_date, from_time, to_time) FROM stdin;
1	4	User 	Sick Leave	2026-07-07	2026-07-08	2	Project Manager		88548570454	Fever	Pending	Leave	\N	\N	\N
2	3	Manager 		\N	\N	0	Admin			Personal Emergency	Approved	Permission	2026-07-07	09:45:00	10:45:00
3	3	Manager 	Sick Leave	2026-07-07	2026-07-11	5	Admin		90854555	Headache	Approved	Leave	\N	\N	\N
\.


--
-- Data for Name: meeting_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meeting_rooms (id, room_name, location, floor, capacity, room_type, projector, tv, whiteboard, video_conference, status, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, notification_type, is_read, project_id, workflow_stage, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, resource, action) FROM stdin;
\.


--
-- Data for Name: project_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_assignments (id, project_id, assigned_user_id, workflow_stage, chapter_id, status, priority, assigned_at, started_at, completed_at, comments) FROM stdin;
\.


--
-- Data for Name: project_chapters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_chapters (id, project_id, chapter_number, chapter_title, file_name, file_path, file_size, status, version, uploaded_at, completed_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, project_code, customer, customer_name, customer_contact, division_code, billing_location, category, sales_person, project_title, priority, complexity, edition, color, trim_size, copyright_year, manuscript_pages, estimated_pages, actual_pages, isbn_number, xml_standard, workflow_id, current_stage, status, is_active, created_at, updated_at, activated_at, completed_at, creator_id, client_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, team_id, created_at) FROM stdin;
1	Asst General Manager		1	2026-07-06 10:29:09.298608
2	Senior Project Manager		1	2026-07-06 10:29:09.302265
3	Project Manager		1	2026-07-06 10:29:09.304034
4	Manuscript Analysis Operator		1	2026-07-06 10:29:09.305309
5	Editorial Manager		2	2026-07-06 10:29:09.30651
6	Team Lead - Editorial		2	2026-07-06 10:29:09.30764
7	Copyeditor		2	2026-07-06 10:29:09.308684
8	Technical Editor		2	2026-07-06 10:29:09.30969
9	Pre Editor		2	2026-07-06 10:29:09.310683
10	Production Manager		3	2026-07-06 10:29:09.311781
11	Team Lead - Production		3	2026-07-06 10:29:09.313077
12	Senior Compositor		3	2026-07-06 10:29:09.314467
13	Compositor		3	2026-07-06 10:29:09.315974
14	Senior Quality Controller		3	2026-07-06 10:29:09.31727
15	Quality Controller		3	2026-07-06 10:29:09.318422
16	Template Team Manager		4	2026-07-06 10:29:09.320411
17	Template Designer		4	2026-07-06 10:29:09.322095
18	Graphics Manager		5	2026-07-06 10:29:09.323513
19	Senior Graphics Designer		5	2026-07-06 10:29:09.324624
20	Graphics Designer		5	2026-07-06 10:29:09.326009
21	XML Manager		6	2026-07-06 10:29:09.327154
22	Senior XML Operator		6	2026-07-06 10:29:09.328322
23	XML Operator		6	2026-07-06 10:29:09.329389
24	Non-XML Manager		7	2026-07-06 10:29:09.330685
25	Senior Non-XML Operator		7	2026-07-06 10:29:09.331801
26	Non-XML Operator		7	2026-07-06 10:29:09.332874
27	Team Lead - Accessibility		8	2026-07-06 10:29:09.33387
28	Accessibility Specialist		8	2026-07-06 10:29:09.335121
29	Index Manager		9	2026-07-06 10:29:09.337057
30	Index Operator		9	2026-07-06 10:29:09.33853
\.


--
-- Data for Name: room_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_bookings (id, booking_id, room_id, meeting_title, organizer_id, organizer_name, department, meeting_date, start_time, end_time, attendees_count, remarks, status, created_at) FROM stdin;
\.


--
-- Data for Name: shift_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_requests (id, employee_id, employee_name, current_shift, requested_shift, reason, reporting_manager, status, manager_comment, created_at, approved_at, rejected_at, request_type, from_date, to_date, shift_date) FROM stdin;
1	4	User 	General Shift	Second Shift		Project Manager	Approved	\N	2026-07-07 04:13:16.034537	2026-07-07 04:13:26.665745	\N	Shift	2026-07-07	2026-07-07	2026-07-07
2	4	User 	General Shift			Project Manager	Approved	\N	2026-07-07 04:13:44.142309	2026-07-07 04:14:03.33492	\N	WFH	2026-07-07	2026-07-10	2026-07-07
3	3	Manager 	General Shift	Night Shift		Admin	Approved	\N	2026-07-07 04:14:31.412395	2026-07-07 04:15:07.866719	\N	WFH	2026-07-07	2026-07-10	2026-07-07
\.


--
-- Data for Name: sla_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sla_tracking (id, project_id, workflow_stage, sla_deadline, actual_completion, is_overdue, overdue_hours, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, description, workflow_stage, created_at) FROM stdin;
1	Project Management Team		Project Management	2026-07-06 10:29:09.286964
2	Editorial Team		Editorial	2026-07-06 10:29:09.288461
3	Production Team		Production	2026-07-06 10:29:09.289347
4	Template Team		Template	2026-07-06 10:29:09.290316
5	Graphics Team		Graphics	2026-07-06 10:29:09.291225
6	XML Conversion Team		XML Conversion	2026-07-06 10:29:09.292106
7	Non-XML Conversion Team		Non-XML Conversion	2026-07-06 10:29:09.292893
8	Accessibility Team		Accessibility	2026-07-06 10:29:09.293655
9	Index Team		Index	2026-07-06 10:29:09.294304
\.


--
-- Data for Name: telecom_directory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telecom_directory (id, department_name, team_name, employee_name, designation, extension_number, status, created_at, location) FROM stdin;
1	Management	CEO	Kris Srinaath	\N	123	Active	2026-07-06 10:29:12.100978	Ground Floor - Right Wing
2	Management	COO	Nandakumar R	\N	124	Active	2026-07-06 10:29:12.10098	Ground Floor - Right Wing
3	Management	EA - CEO	Jayashree Muthuramaswami	\N	122	Active	2026-07-06 10:29:12.10098	Ground Floor - Right Wing
4	Administration	Manager Admin	Sujatha Nair	\N	125	Active	2026-07-06 10:29:12.100981	Ground Floor - Right Wing
5	Administration	Front Office	Reception	\N	111/112	Active	2026-07-06 10:29:12.100981	Ground Floor - Right Wing
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
29	Accessible / Data Team	Automation Specialist / Conversition	Ilayaraja P / Gopi	\N	114	Active	2026-07-06 10:29:12.100987	Ground Floor - Left Wing
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
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, company_email, password_hash, role_id, team_id, access_level, status, is_active, created_at, updated_at, last_login) FROM stdin;
5	Umasangeetha P	Umasangeetha	Umasangeetha	scrypt:32768:8:1$dkw2k1wOMR8xnW42$7d4da4fa7282062d47e10f70f4c23512f7e15f8c3387de2d5514eb69360d1c081547b700d4af9e61444544c333dcb766b77b096295a5d29ff3b5baf06343332f	5	2	manager	active	t	2026-07-06 10:29:09.712436	2026-07-06 10:29:09.712439	\N
8	Annapurna B	Annapurna	Annapurna	scrypt:32768:8:1$bjDaFahVnXucf44v$462195aaa63961d87546599384124bab2682a28230881ebeebef408acf1611dbdcc2f93d8a1d65e22724187ee1441505e2f1d3da56cc6573399f7a2d69cedc1a	6	2	manager	active	t	2026-07-06 10:29:09.913795	2026-07-06 10:29:09.913798	\N
9	Lavanya V	Lavanya	Lavanya	scrypt:32768:8:1$gx30aITBlO4A2dNb$2468d0c5ac99bdb24f54cca99bd013b3093dde9fdb55b0d0f467a4171f778de7c165992b3ae9afe480fbb2769d76a6d49cb16740ae5983b40a912698ea31834f	6	2	manager	active	t	2026-07-06 10:29:09.979314	2026-07-06 10:29:09.979317	\N
10	Muthukumar S	Muthukumar	Muthukumar	scrypt:32768:8:1$1mNYhxoqoCkViK7i$8d42373b61a95d51b9d537b4d209f51b7cb0886257d56738dca7739e6d353d87c91b8562d366145e8943b89dd2681b4870ccd8ea25d98cc6cae1c723a4507e76	5	2	manager	active	t	2026-07-06 10:29:10.04642	2026-07-06 10:29:10.046423	\N
11	Madhu Malini N S	Madhu	Madhu	scrypt:32768:8:1$LMmmsTxXRd5VaXeN$2012281d8280fd527088050f199ac38c509d54c5b10b3bd0d89b552fc1702c3dc0f19b5933d39dc483ebf4bd80afb10c31a3094e20079b340523f400bd10726d	5	2	manager	active	t	2026-07-06 10:29:10.116979	2026-07-06 10:29:10.116982	\N
12	Priyavarthini M	Priyavarthini	Priyavarthini	scrypt:32768:8:1$QO7rD0QFp8do914s$f6cb1057759e1a01086c7242b88d1be632b0c617576fe7fcd8543829fefc30f96a8e53ea44dc49105b8b3b9ce55794828cb968ab759e6b2b46e60862d99a128a	6	2	manager	active	t	2026-07-06 10:29:10.184731	2026-07-06 10:29:10.184734	\N
13	Mahalakshmi G	Mahalakshmi	Mahalakshmi	scrypt:32768:8:1$o4fmgFSdqvRGMZqW$5b767db1a8e1e87dd9e3c01f5271bf77488edc6f1197d871eeeacf4d998ba2bf7e934a382077630576d0976bebbe9c029cfb90479517a3d83842da514ee709a3	5	2	manager	active	t	2026-07-06 10:29:10.25246	2026-07-06 10:29:10.252463	\N
15	Chirumavilla Janardhan	Chirumavilla	Chirumavilla	scrypt:32768:8:1$grdw4nSvt7bcWhrl$6b3e5a81dbafae66788485581d0fce8ea0cca4e1442aafed5df7758615de6556221028d6c15b337b77d1d0054f6c2232edcd0451d701d175863e9fc2c3fd719a	6	2	manager	active	t	2026-07-06 10:29:10.388513	2026-07-06 10:29:10.388515	\N
16	Srinivasan R	Srinivasan	Srinivasan	scrypt:32768:8:1$YuJkwRq3bi7MkFM1$38195e91fe355205807655013ed41a229d6393f98772b0014faa70efc3a60147ebfac51dd15b2e5fe62ccb6f3d860cefa1cfa53029abe3db84bc7de10169fb52	5	2	manager	active	t	2026-07-06 10:29:10.456147	2026-07-06 10:29:10.456149	\N
17	Rajavalli Selvaraj	Rajavalli	Rajavalli	scrypt:32768:8:1$D5DmDhwYs9xjMyuu$d9bc05918649ee9cb323b7d06de564858185858dd4e45e1ade36797d09d36b5df81cd7fd1c02430549d3d3c514f98fcd3c78c77cac0ae18c32c616de6370e4ea	8	2	user	active	t	2026-07-06 10:29:10.536031	2026-07-06 10:29:10.536034	\N
18	Shalini Bakthavatchalam	Shalini	Shalini	scrypt:32768:8:1$PQosFz9mc8bQTjai$b8c04e71ba8a85b5230e5bdd60a644f572ffb6384b06ec7306d4f2a96cc1263d758e44630a9af71d8987e77612db835273cc2179815f709fba375fba5fe26bf6	6	2	manager	active	t	2026-07-06 10:29:10.603163	2026-07-06 10:29:10.603166	\N
19	Gowsalya M	Gowsalya	Gowsalya	scrypt:32768:8:1$v56n6y6FAf7dDV01$8689e54a0f015f52d370b59d48405e745262edc781a8bccb04719a2c7132a6e975a4bad10d341830dc405f4037d6736637d1b5918e5c6aadfbe3941919b95d8d	8	2	user	active	t	2026-07-06 10:29:10.668447	2026-07-06 10:29:10.66845	\N
20	Gurunathan R	Gurunathan	Gurunathan	scrypt:32768:8:1$9CJNmIDWWyWHbeGC$3e033f2e22a3429d1342b1b52e9489a8003b64e92cdd5f51de89a476ceaa0988f132ea33d948d29711ec1aefc3db15d4afc7ed233e9b55052dc11d43a14eafcd	5	2	manager	active	t	2026-07-06 10:29:10.733243	2026-07-06 10:29:10.733246	\N
21	Sujatha S	Sujatha	Sujatha	scrypt:32768:8:1$T8MFjdUAm2gn2vsD$198ce9b32ef2413eb7f9aa31f7db85ca8611d2f7f6d42db88e142b3a07c80002830a1788132ef6c6bbbf9cb7a7735a29c1087d6a830dcd4cd43eac508fc4bf07	5	2	manager	active	t	2026-07-06 10:29:10.805241	2026-07-06 10:29:10.805244	\N
22	Gopalakrishnan S	Gopalakrishnan	Gopalakrishnan	scrypt:32768:8:1$t9unrj7tx8JhWy2r$1b040c550f73226b4649febcf178f0005275490c4ee11e3270d965e8a2ceb11d42b987cc0ec880836ee0b6b2669cbfa3f7c64653ae75da53dce0f686f4fe1e06	5	2	manager	active	t	2026-07-06 10:29:10.87127	2026-07-06 10:29:10.871272	\N
23	Chandra Kumar C	Chandra	Chandra	scrypt:32768:8:1$0h0GVuuI5iapBF2H$08693c00e173cbe1a6a43aa802f739370f180bbc8a7bf4e888925e156af7fea07358de178f711fba731e1ad291ded769c4994950ccba3a8f91ea030c867cf04c	8	2	user	active	t	2026-07-06 10:29:10.938814	2026-07-06 10:29:10.938817	\N
24	Sangeetha A	Sangeetha	Sangeetha	scrypt:32768:8:1$v3zp8dwQuBTETIN0$28dac71a76f497ed425ae36fc911712b38724521c04886639142ac402219de91372ea2243e25bbf26bfe42fcb4ba4ba64213f43ee3956e9753687a83e49bf59e	6	2	manager	active	t	2026-07-06 10:29:11.005445	2026-07-06 10:29:11.005448	\N
25	Anbarasan K	Anbarasan	Anbarasan	scrypt:32768:8:1$DphlE4weckZ9r9vA$2009bce358a6fb6af9b16442b0cae6b4031de3bdac56b6f7114ab3c5431dcdfda258470abc8dd7633d1a03326dc44c9d307edc1b7d377ca572b158b957f044a6	8	2	user	active	t	2026-07-06 10:29:11.073467	2026-07-06 10:29:11.073469	\N
26	Saranya Kamaraj	Saranya	Saranya	scrypt:32768:8:1$IXjFGgmlHJhiaHHX$8b593d92f427e3cccee3a37ac29c734dadcfaa190338eb07af0a30b1b35de268278da40853aa9b394087e9012b6648f6131b2d971a3d0710c311938ec1dc52d5	8	2	user	active	t	2026-07-06 10:29:11.142969	2026-07-06 10:29:11.142972	\N
27	Shalom Kumar Sigworth	Shalom	Shalom	scrypt:32768:8:1$TvJnRcjimnN6LTAL$9d011f574219c78ed4abfb5e6e6fa006e8c983e36dfa9acd59b48bc3f1356702f359ca34d38edad34ea99f0030890afb9e80e333542e168046f14073c7849763	5	2	manager	active	t	2026-07-06 10:29:11.211148	2026-07-06 10:29:11.211151	\N
28	Prakash B	Prakash	Prakash	scrypt:32768:8:1$U2aq9qfcZtlF48HM$9c07a9647eff62da1d5413b2ee900606dd859a7388aa211806b3c205e9493b0b29a3ca166b641ddb0db13b11923c91324f3eb96910da7a516fe2a12be8a1c1ad	7	2	user	active	t	2026-07-06 10:29:11.280747	2026-07-06 10:29:11.280749	\N
1	Admin	admin@wms.com	admin@wms.com	scrypt:32768:8:1$cwR9KJ44ve9hdAqo$e1ed184d91eb0494df16a3e04682bf047ac7d3f22f203322b3aed2896ec4f4e7c9091dcc589c7fff5972b8485e19ad4f65b5334b574d1a6ef63ec1b82f691822	1	1	admin	active	t	2026-07-06 10:29:09.424663	2026-07-07 06:58:29.248642	2026-07-07 06:58:29.248161
4	User	user@wms.com	user@wms.com	scrypt:32768:8:1$k4igX3U1zZCnlcuT$b56a92e9545e97ef071e74f604f6be3cbf18c47ec4a5c5715af677f48c5039506bfd2188d0143aeeaa62f08118f7637a1bb0a9ad21f85c8f65fc0b26d285f8c9	7	2	user	active	t	2026-07-06 10:29:09.645965	2026-07-07 04:11:53.064345	2026-07-07 04:11:53.063969
3	Manager	manager@wms.com	manager@wms.com	scrypt:32768:8:1$XSsVxB4usODExVhg$5dfb7f145db12c97ce827f62b2315b5c8048c920f9152911740ac52fe2514ffbb087ce27302665d14bdcee95b147dfb3af4e2025a093df30a923b530e5aa8521	3	1	manager	active	t	2026-07-06 10:29:09.577417	2026-07-07 06:05:32.435802	2026-07-07 06:05:32.435358
7	Murali B	Murali	Murali	scrypt:32768:8:1$kyInuERYH4mGIuu9$a9cda203a12dc805f18f0c217430f6b42fee9416dcd35b6a0bf82739a12917d67a931d1185c957b981d0af019072d183f3ffe002811c6d9cab423d43f6b2b91a	5	2	manager	active	t	2026-07-06 10:29:09.845778	2026-07-07 06:47:24.8862	2026-07-07 06:47:24.885655
6	Aravind K	Aravind	Aravind	scrypt:32768:8:1$OhHCW3AYNprICZDX$f534b71f46e01b0c649abe802b9d094a11be279e1f2bbb054ef7988a18c6371265978df7e660ee9f9fad30c88ac8aac28c0fc75cab4850b38254d6d4b95da8aa	5	2	manager	active	t	2026-07-06 10:29:09.779203	2026-07-07 06:18:35.581494	2026-07-07 06:18:35.581138
14	Anand Jayaram	Anand	Anand	scrypt:32768:8:1$rS6xNtY9bhxqLeJt$2ab2a1e0b27df1ad613ad6de891dfa53619b43dd4a25a5bd7ddee32bd0bb1b0c1c25a944b020e9a38d6efc531dda654169d05b9e29770c1d274c504a44be890f	8	2	user	active	t	2026-07-06 10:29:10.321834	2026-07-07 06:48:54.701076	2026-07-07 06:48:54.700841
29	Supriya Subramanian	Supriya	Supriya	scrypt:32768:8:1$8Om7bPvdoZWOGdfj$7cea14e0079ec2a331301305dc0cfa657851076ef4474f4cb94a6e5aaaf5513670c452ca92186e07b8cd0bc212152fe98986a3784aadf72836f8d0240fb75aae	5	2	manager	active	t	2026-07-06 10:29:11.351241	2026-07-06 10:29:11.351244	\N
30	J JUDE RAEYMOND	J	J	scrypt:32768:8:1$LadXEXie6kTDLToo$f6c9010a2eed6e37c204d3a51d6fa83340c61554f5511a56610d241a024dbbdcb9976a37c83c457153f928a553fbf3607a66ff03d7e56fbdafb20e3bec9d2b97	7	2	user	active	t	2026-07-06 10:29:11.426818	2026-07-06 10:29:11.426821	\N
31	Sumathi R	Sumathi	Sumathi	scrypt:32768:8:1$A9RM1N6xNpIfXqdv$811881d981687c41890d357b24d78477b6355d7007a766a78966133831035225cf2ebbab04d41892ea110e8e1939c9fe72f6e87e63555ab8102d22469578d698	5	2	manager	active	t	2026-07-06 10:29:11.495073	2026-07-06 10:29:11.495076	\N
32	Vigneshwar amoorthy S	Vigneshwar	Vigneshwar	scrypt:32768:8:1$tHQC3Qd3AG3rz00n$98e50856ae7e39c40a24c20dfe401f3c890ddc3a0a99f7894d714363e2807111cbe998e6fe2cc2f75954a6cdf6bf01d32fae84fe6cea05613a5caa533d2b65dc	6	2	manager	active	t	2026-07-06 10:29:11.561253	2026-07-06 10:29:11.561256	\N
33	Manikaraj T	Manikaraj	Manikaraj	scrypt:32768:8:1$1AdXv8x9EUivnmOi$0bd6d069088d8422940c2900618955c08d9c6e2d1cb50975b549b59ea049bc5c5ce7edfbdcee2531811c824eeef6f3918cdfa01e43ebfc4d14c4cff421bea4df	8	2	user	active	t	2026-07-06 10:29:11.627036	2026-07-06 10:29:11.627039	\N
34	Nivetha M	Nivetha	Nivetha	scrypt:32768:8:1$jJ26wZZBMdUSB7pw$e589864d00dc95ade98169c41897e5bf0d189363c040d554cddf83eab80817682c5ad3bf1227bddff128dea9e5a88b58d331a26e507fbdfa4b0249e9389d7c65	8	2	user	active	t	2026-07-06 10:29:11.697314	2026-07-06 10:29:11.697317	\N
35	Patrick Nithyan	Patrick	Patrick	scrypt:32768:8:1$DbB4oAjYklgcrnnv$794bb4527ccb08f07efa33985e2e8900a1ae1891b450b7a6c4c5c25ae4e4834a5b21125567235ecd049018507dc5b89ec919c4950d5c9edd6529fa1c2ffb091a	8	2	user	active	t	2026-07-06 10:29:11.762638	2026-07-06 10:29:11.762641	\N
36	Hemamalini	Hemamalini	Hemamalini	scrypt:32768:8:1$RwiFSAT9IBe32LKC$0bf9511bb7f2c6c5a01d078fa02f38df0a6855ab69f6b2f223bf4e344df7328c0fda60618638e20072a530ef911df8352998029e61d3be84917f55c0948641d3	7	2	user	active	t	2026-07-06 10:29:11.828885	2026-07-06 10:29:11.828887	\N
38	Nirmal Kumar	Nirmal	Nirmal	scrypt:32768:8:1$8th4tqBMloxisDyE$4fbe0193417d7c1084ce95b1cb6ecded953955ce5797a2163779d25c88d8263e4db5d0448010206c90147c27da44d333ac7d3feb30a852df9610691bec916d92	8	2	user	active	t	2026-07-06 10:29:11.96681	2026-07-06 10:29:11.966813	\N
39	Viswanathan K	Viswanathan	Viswanathan	scrypt:32768:8:1$TJUC1JKCjzUtrGCO$419e9d07bc12ebba4e23dc97d1549698fef0c6def5d62028683c8650e36e41d74dc9ddbdbcef5fb712f76db24501ddb595fe0ef5533caaa342089208d3a3de12	8	2	user	active	t	2026-07-06 10:29:12.033974	2026-07-06 10:29:12.033977	\N
37	Selva Bharath p	Selvabara@gmail.com	Selva	scrypt:32768:8:1$ghNaLvjRW6GFWpaZ$6dfe22930cfadc0699aaa5933f0d73b48803a9a1e0e24a9ecd7a95a048b42b346cc10c9cb4e2ce2308f3b0f6943d96f6edf259d9ed5eb2743b329ec6e8e51e66	7	2	user	active	t	2026-07-06 10:29:11.89666	2026-07-07 06:48:24.132859	2026-07-07 06:48:24.132604
2	HR Manager	hr@wms.com	hr@wms.com	scrypt:32768:8:1$iMp8itm4sGoOjHTH$01e5c0238e39e9ff3b6c9f633535e5275365209428c9d908d8deaf4350fdc0c8b88ed4dccd862dbb8514156c0f5dcf5dd729fdfc3030c025293fba845515059f	5	2	hr	active	t	2026-07-06 10:29:09.505111	2026-07-07 06:57:52.716359	2026-07-07 06:57:52.715013
\.


--
-- Data for Name: workflow_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_history (id, project_id, from_stage, to_stage, changed_by_user_id, started_at, completed_at, duration_hours, comments) FROM stdin;
\.


--
-- Data for Name: workflow_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_stages (id, workflow_id, name, "order", description, sla_hours, required_role_id, is_active) FROM stdin;
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, name, description, is_active, created_at) FROM stdin;
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 6, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- Name: communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.communications_id_seq', 1, false);


--
-- Name: employee_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_notifications_id_seq', 13, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 39, true);


--
-- Name: leave_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_ledger_id_seq', 1, false);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 3, true);


--
-- Name: meeting_rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meeting_rooms_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: project_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_assignments_id_seq', 1, false);


--
-- Name: project_chapters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_chapters_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 30, true);


--
-- Name: room_bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_bookings_id_seq', 1, false);


--
-- Name: shift_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_requests_id_seq', 3, true);


--
-- Name: sla_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sla_tracking_id_seq', 1, false);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teams_id_seq', 9, true);


--
-- Name: telecom_directory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telecom_directory_id_seq', 53, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 39, true);


--
-- Name: workflow_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_history_id_seq', 1, false);


--
-- Name: workflow_stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflow_stages_id_seq', 1, false);


--
-- Name: workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflows_id_seq', 1, false);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: employee_notifications employee_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_notifications
    ADD CONSTRAINT employee_notifications_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: leave_ledger leave_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_ledger
    ADD CONSTRAINT leave_ledger_pkey PRIMARY KEY (id);


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
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


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
-- Name: project_assignments project_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_pkey PRIMARY KEY (id);


--
-- Name: project_chapters project_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_chapters
    ADD CONSTRAINT project_chapters_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);


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
-- Name: sla_tracking sla_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_tracking
    ADD CONSTRAINT sla_tracking_pkey PRIMARY KEY (id);


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
-- Name: workflow_history workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT workflow_history_pkey PRIMARY KEY (id);


--
-- Name: workflow_stages workflow_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_stages
    ADD CONSTRAINT workflow_stages_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_name_key UNIQUE (name);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: project_assignments project_assignments_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id);


--
-- Name: project_assignments project_assignments_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.project_chapters(id);


--
-- Name: project_assignments project_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_chapters project_chapters_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_chapters
    ADD CONSTRAINT project_chapters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: projects projects_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: projects projects_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


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
-- Name: sla_tracking sla_tracking_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_tracking
    ADD CONSTRAINT sla_tracking_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


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
-- Name: workflow_history workflow_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT workflow_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id);


--
-- Name: workflow_history workflow_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT workflow_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: workflow_stages workflow_stages_required_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_stages
    ADD CONSTRAINT workflow_stages_required_role_id_fkey FOREIGN KEY (required_role_id) REFERENCES public.roles(id);


--
-- Name: workflow_stages workflow_stages_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_stages
    ADD CONSTRAINT workflow_stages_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- PostgreSQL database dump complete
--

\unrestrict GYbecUUysVuKfhRmHQT7Roe6gjcIGJ871ceJjwdAm32BZ7kw603XdDwrCedUDtX

