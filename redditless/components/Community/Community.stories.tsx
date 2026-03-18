import type { Meta, StoryObj } from '@storybook/react';
import { Community } from './Community';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Community> = {
  title: 'Community',
  component: Community,
  parameters: {},
  tags: ['autodocs'],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCommunity: Story = {
  args: {
    ownerEmail: 'admin@example.com',
    ownerName: 'Community Admin',
    timestamp: Date.now(),
    body: '# Welcome to Tech Discussion\n\nA community for discussing technology, programming, and innovation.',
    hash: 'community-empty-123',
    threads: [],
  },
};

export const SmallCommunity: Story = {
  args: {
    ownerEmail: 'moderator@example.com',
    ownerName: 'TechModerator',
    timestamp: Date.now() - 86400000,
    body: '# Programming Help\n\nA place to ask questions and get help with programming challenges.',
    hash: 'community-small-456',
    threads: [
      {
        ownerName: 'John Doe',
        timestamp: Date.now() - 3600000,
        hash: 'thread-1',
        body: '# How do I center a div?\n\nI\'ve been struggling with CSS layout and need help centering content.',
      },
      {
        ownerName: 'Jane Smith',
        timestamp: Date.now() - 7200000,
        hash: 'thread-2',
        body: '# React hooks best practices\n\nLooking for advice on when to use useState vs useReducer.',
      },
      {
        ownerName: 'DevExpert',
        timestamp: Date.now() - 10800000,
        hash: 'thread-3',
        body: '# TypeScript migration guide\n\nStep-by-step process for migrating JavaScript projects to TypeScript.',
      },
    ],
  },
};

export const ActiveCommunity: Story = {
  args: {
    ownerEmail: 'owner@gamedev.com',
    ownerName: 'GameDevStudio',
    timestamp: Date.now() - 172800000,
    body: '# Game Development Community\n\nShare your projects, get feedback, and collaborate with other game developers.',
    hash: 'community-active-789',
    threads: [
      {
        ownerName: 'PixelArtist99',
        timestamp: Date.now() - 1800000,
        hash: 'thread-pixel-1',
        body: '# 2D platformer mechanics discussion\n\nExploring different approaches to character movement and collision detection.',
      },
      {
        ownerName: 'CodeMaster3000',
        timestamp: Date.now() - 3600000,
        hash: 'thread-code-2',
        body: '# Unity vs Unreal Engine for indie developers\n\nPros and cons of each engine for small team development.',
      },
      {
        ownerName: 'SoundDesigner',
        timestamp: Date.now() - 5400000,
        hash: 'thread-sound-3',
        body: '# Creating immersive audio experiences\n\nTechniques for spatial audio and dynamic music systems.',
      },
      {
        ownerName: 'IndieGameMaker',
        timestamp: Date.now() - 7200000,
        hash: 'thread-indie-4',
        body: '# Marketing your first game on Steam\n\nLessons learned from my recent game launch experience.',
      },
      {
        ownerName: 'UIDesignPro',
        timestamp: Date.now() - 9000000,
        hash: 'thread-ui-5',
        body: '# Game UI/UX design patterns\n\nBest practices for creating intuitive game interfaces.',
      },
      {
        ownerName: 'MobileGameDev',
        timestamp: Date.now() - 10800000,
        hash: 'thread-mobile-6',
        body: '# Optimizing games for mobile devices\n\nPerformance tips and battery life considerations.',
      },
    ],
  },
};

export const TechSupportCommunity: Story = {
  args: {
    ownerEmail: 'support@techhelp.org',
    ownerName: 'TechSupport',
    timestamp: Date.now() - 259200000,
    body: '# Technical Support Forum\n\nGet help with hardware, software, and troubleshooting issues.',
    hash: 'community-support-012',
    threads: [
      {
        ownerName: 'FrustratedUser',
        timestamp: Date.now() - 900000,
        hash: 'thread-wifi-1',
        body: '# WiFi keeps disconnecting on Windows 11\n\nMy laptop loses WiFi connection every few minutes.',
      },
      {
        ownerName: 'LinuxNewbie',
        timestamp: Date.now() - 1800000,
        hash: 'thread-linux-2',
        body: '# Installing graphics drivers on Ubuntu\n\nNeed help getting my NVIDIA card working properly.',
      },
      {
        ownerName: 'MacUser2024',
        timestamp: Date.now() - 2700000,
        hash: 'thread-mac-3',
        body: '# MacBook Pro running slow after update\n\nPerformance issues after installing latest macOS update.',
      },
      {
        ownerName: 'BuilderPC',
        timestamp: Date.now() - 3600000,
        hash: 'thread-build-4',
        body: '# First time PC build - no display output\n\nBuilt my first PC but getting no signal to monitor.',
      },
    ],
  },
};

export const LargeCommunity: Story = {
  args: {
    ownerEmail: 'founder@opensourcedev.net',
    ownerName: 'OpenSourceFounder',
    timestamp: Date.now() - 604800000,
    body: '# Open Source Development Hub\n\nCollaborate on open source projects and share knowledge with the community.',
    hash: 'community-large-345',
    threads: [
      {
        ownerName: 'ContributorOne',
        timestamp: Date.now() - 600000,
        hash: 'thread-contrib-1',
        body: '# New contributor guide for React project\n\nStep-by-step instructions for making your first contribution.',
      },
      {
        ownerName: 'MaintainerPro',
        timestamp: Date.now() - 1200000,
        hash: 'thread-maintain-2',
        body: '# Managing open source project burnout\n\nTips for sustainable project maintenance and community building.',
      },
      {
        ownerName: 'DocWriter',
        timestamp: Date.now() - 1800000,
        hash: 'thread-docs-3',
        body: '# Documentation best practices\n\nHow to write clear, helpful documentation that users actually read.',
      },
      {
        ownerName: 'SecurityExpert',
        timestamp: Date.now() - 2400000,
        hash: 'thread-security-4',
        body: '# Security vulnerability reporting process\n\nProper procedures for responsible disclosure in open source.',
      },
      {
        ownerName: 'CIExpert',
        timestamp: Date.now() - 3000000,
        hash: 'thread-ci-5',
        body: '# GitHub Actions workflows for Node.js projects\n\nAutomating testing, building, and deployment processes.',
      },
      {
        ownerName: 'LicenseLawyer',
        timestamp: Date.now() - 3600000,
        hash: 'thread-license-6',
        body: '# Choosing the right open source license\n\nComparison of MIT, Apache, GPL, and other popular licenses.',
      },
      {
        ownerName: 'CommunityManager',
        timestamp: Date.now() - 4200000,
        hash: 'thread-community-7',
        body: '# Building inclusive open source communities\n\nStrategies for welcoming contributors from diverse backgrounds.',
      },
      {
        ownerName: 'APIDesigner',
        timestamp: Date.now() - 4800000,
        hash: 'thread-api-8',
        body: '# RESTful API design principles\n\nBest practices for creating maintainable and user-friendly APIs.',
      },
    ],
  },
};

export const SpecializedCommunity: Story = {
  args: {
    ownerEmail: 'admin@rustlang-community.dev',
    ownerName: 'RustCommunityLead',
    timestamp: Date.now() - 1209600000,
    body: '# Rust Programming Language Community\n\nDiscuss Rust development, share projects, and help each other learn systems programming.',
    hash: 'community-rust-678',
    threads: [
      {
        ownerName: 'RustNovice',
        timestamp: Date.now() - 3600000,
        hash: 'thread-ownership-1',
        body: '# Understanding Rust ownership and borrowing\n\nStruggling with the borrow checker and need conceptual help.',
      },
      {
        ownerName: 'SystemsProgrammer',
        timestamp: Date.now() - 7200000,
        hash: 'thread-async-2',
        body: '# Async/await patterns in Rust\n\nBest practices for writing asynchronous Rust applications.',
      },
      {
        ownerName: 'WebDevRust',
        timestamp: Date.now() - 10800000,
        hash: 'thread-web-3',
        body: '# Building web APIs with Actix vs Warp\n\nComparing different web frameworks for REST API development.',
      },
      {
        ownerName: 'PerformanceGuru',
        timestamp: Date.now() - 14400000,
        hash: 'thread-perf-4',
        body: '# Zero-cost abstractions in practice\n\nReal-world examples of Rust\'s performance guarantees.',
      },
    ],
  },
};
