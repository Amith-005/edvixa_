import bcrypt from 'bcryptjs'

import { connectDatabase } from '../config/database.js'
import { env } from '../config/env.js'
import { AvailabilityModel } from '../modules/availability/models/availability.model.js'
import { TeacherReviewModel } from '../modules/reviews/models/teacher-review.model.js'
import { SubjectModel } from '../modules/subjects/models/subject.model.js'
import { TeacherProfileModel } from '../modules/teachers/models/teacher-profile.model.js'
import { UserModel } from '../modules/users/models/user.model.js'

await connectDatabase()

let admin = await UserModel.findOne({ email: env.ADMIN_EMAIL })
if (!admin) {
  admin = await UserModel.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
    role: 'admin',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  })
}

const subjects = [
  {
    name: 'Mathematics',
    slug: 'mathematics',
    description: 'Numbers, algebra, geometry and calculus',
    gradeLevels: ['8', '9', '10', '11', '12'],
    topics: [
      { name: 'Algebra', difficultyLevel: 2 },
      { name: 'Geometry', difficultyLevel: 2 },
    ],
  },
  {
    name: 'Physics',
    slug: 'physics',
    description: 'Mechanics, waves, electricity and modern physics',
    gradeLevels: ['9', '10', '11', '12'],
    topics: [
      { name: 'Mechanics', difficultyLevel: 2 },
      { name: 'Electricity', difficultyLevel: 3 },
    ],
  },
  {
    name: 'Chemistry',
    slug: 'chemistry',
    description: 'Physical, organic and inorganic chemistry',
    gradeLevels: ['9', '10', '11', '12'],
    topics: [
      { name: 'Atomic Structure', difficultyLevel: 2 },
      { name: 'Chemical Bonding', difficultyLevel: 3 },
    ],
  },
]

for (const subject of subjects) {
  await SubjectModel.updateOne(
    { slug: subject.slug },
    { $setOnInsert: { ...subject, createdBy: admin._id } },
    { upsert: true },
  )
}

const subjectDocs = await SubjectModel.find({
  slug: { $in: subjects.map((subject) => subject.slug) },
}).lean()
const subjectBySlug = new Map(
  subjectDocs.map((subject) => [subject.slug, subject]),
)

const teacherPasswordHash = await bcrypt.hash('TeacherDemo@123', 12)
const demoTeachers = [
  {
    name: 'Ananya Menon',
    email: 'ananya.math@edvixa.local',
    bio: 'Patient mathematics mentor who turns difficult concepts into clear, practical steps.',
    subjectSlugs: ['mathematics', 'physics'],
    qualification: 'M.Sc. Mathematics, B.Ed.',
    experienceYears: 8,
    languages: ['English', 'Malayalam'],
    hourlyRate: 650,
    rating: 4.9,
    totalReviews: 124,
    totalSessionsCompleted: 420,
    totalStudentsTaught: 165,
    averageResponseTimeMinutes: 18,
    times: ['16:00', '18:30', '20:00'],
  },
  {
    name: 'Rahul Nair',
    email: 'rahul.physics@edvixa.local',
    bio: 'Physics tutor focused on mechanics, problem solving, and exam-ready numerical practice.',
    subjectSlugs: ['physics'],
    qualification: 'M.Tech. Mechanical Engineering',
    experienceYears: 6,
    languages: ['English', 'Malayalam', 'Hindi'],
    hourlyRate: 500,
    rating: 4.7,
    totalReviews: 89,
    totalSessionsCompleted: 286,
    totalStudentsTaught: 112,
    averageResponseTimeMinutes: 25,
    times: ['10:00', '17:00', '19:30'],
  },
  {
    name: 'Meera Thomas',
    email: 'meera.chemistry@edvixa.local',
    bio: 'Chemistry specialist helping students master concepts through visual explanations and revision plans.',
    subjectSlugs: ['chemistry'],
    qualification: 'M.Sc. Chemistry, SET',
    experienceYears: 5,
    languages: ['English', 'Malayalam'],
    hourlyRate: 450,
    rating: 4.8,
    totalReviews: 102,
    totalSessionsCompleted: 318,
    totalStudentsTaught: 138,
    averageResponseTimeMinutes: 14,
    times: ['09:30', '15:30', '18:00'],
  },
  {
    name: 'Arjun Rao',
    email: 'arjun.science@edvixa.local',
    bio: 'Friendly science teacher for students who want steady progress and confidence before exams.',
    subjectSlugs: ['mathematics', 'chemistry'],
    qualification: 'B.Sc., B.Ed. Mathematics',
    experienceYears: 4,
    languages: ['English', 'Hindi', 'Kannada'],
    hourlyRate: 350,
    rating: 4.5,
    totalReviews: 41,
    totalSessionsCompleted: 146,
    totalStudentsTaught: 73,
    averageResponseTimeMinutes: 32,
    times: ['11:00', '16:30', '19:00'],
  },
  {
    name: 'Priya Shah',
    email: 'priya.stem@edvixa.local',
    bio: 'Experienced STEM educator offering structured lessons, doubt clearing, and personalised study plans.',
    subjectSlugs: ['physics', 'chemistry'],
    qualification: 'M.Sc. Physics, M.Ed.',
    experienceYears: 9,
    languages: ['English', 'Hindi'],
    hourlyRate: 800,
    rating: 4.9,
    totalReviews: 156,
    totalSessionsCompleted: 512,
    totalStudentsTaught: 204,
    averageResponseTimeMinutes: 12,
    times: ['08:30', '14:00', '17:30'],
  },
]

const demoReviewers = [
  {
    name: 'Aisha P.',
    email: 'reviewer.aisha@edvixa.local',
  },
  {
    name: 'Kiran S.',
    email: 'reviewer.kiran@edvixa.local',
  },
  {
    name: 'Diya M.',
    email: 'reviewer.diya@edvixa.local',
  },
]

const reviewerUsers = []
for (const reviewer of demoReviewers) {
  const reviewerUser = await UserModel.findOneAndUpdate(
    { email: reviewer.email },
    {
      $set: {
        name: reviewer.name,
        role: 'student',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      $setOnInsert: { passwordHash: teacherPasswordHash },
    },
    { upsert: true, new: true, runValidators: true },
  )
  reviewerUsers.push(reviewerUser)
}

const reviewTemplates = [
  [
    'The explanations were clear and the lesson moved at exactly the right pace. I finally understood the difficult parts.',
    'Very patient and organised. The practice questions were close to what I needed for my exam.',
    'A helpful session with practical examples and a clear plan for what to study next.',
  ],
  [
    'The numerical problems were explained step by step and I felt much more confident after the class.',
    'Great doubt-clearing session. Complex ideas were broken into simple parts without rushing.',
    'The session was focused and useful. I especially liked the quick recap at the end.',
  ],
  [
    'The visual explanations made the topic much easier to remember. The revision tips were excellent.',
    'A calm and encouraging teacher who checked that I understood each concept before moving on.',
    'Very useful for exam preparation. The examples and summary notes were easy to follow.',
  ],
  [
    'Friendly teaching style and lots of chances to ask questions. I left the session feeling more confident.',
    'The lesson was structured well and the teacher gave useful feedback on my mistakes.',
    'A good balance of concept explanation and practice. I would book another session.',
  ],
  [
    'Excellent subject knowledge and a very structured approach. The personalised study plan was a big help.',
    'The session was engaging, focused, and full of useful exam strategies.',
    'Clear explanations, thoughtful feedback, and strong follow-up guidance after the lesson.',
  ],
]

const today = new Date()
today.setHours(0, 0, 0, 0)

for (const [teacherIndex, teacherData] of demoTeachers.entries()) {
  const teacherUser = await UserModel.findOneAndUpdate(
    { email: teacherData.email },
    {
      $set: {
        name: teacherData.name,
        role: 'teacher',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      $setOnInsert: { passwordHash: teacherPasswordHash },
    },
    { upsert: true, new: true, runValidators: true },
  )

  const subjectIds = teacherData.subjectSlugs
    .map((slug) => subjectBySlug.get(slug)?._id)
    .filter((id): id is NonNullable<typeof id> => Boolean(id))

  await TeacherProfileModel.findOneAndUpdate(
    { userId: teacherUser._id },
    {
      $set: {
        bio: teacherData.bio,
        subjects: subjectIds,
        qualification: teacherData.qualification,
        experienceYears: teacherData.experienceYears,
        languages: teacherData.languages,
        hourlyRate: teacherData.hourlyRate,
        timezone: 'Asia/Kolkata',
        rating: teacherData.rating,
        totalReviews: teacherData.totalReviews,
        totalSessionsCompleted: teacherData.totalSessionsCompleted,
        totalStudentsTaught: teacherData.totalStudentsTaught,
        approvalStatus: 'approved',
        isApproved: true,
        rejectionReason: null,
        approvedAt: new Date(),
        approvedBy: admin._id,
        profileCompletedPercent: 100,
        averageResponseTimeMinutes: teacherData.averageResponseTimeMinutes,
      },
    },
    { upsert: true, new: true, runValidators: true },
  )

  await AvailabilityModel.deleteMany({
    teacherId: teacherUser._id,
    date: { $gte: today },
    isBooked: false,
  })

  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset + (teacherIndex % 2))
    const startTime = teacherData.times[(dayOffset - 1) % teacherData.times.length]!
    const [hour, minute] = startTime.split(':').map(Number)
    const endMinutes = (hour ?? 0) * 60 + (minute ?? 0) + 60
    const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    await AvailabilityModel.updateOne(
      { teacherId: teacherUser._id, date, startTime },
      {
        $set: {
          endTime,
          timezone: 'Asia/Kolkata',
          isBooked: false,
          isBlocked: false,
          isRecurring: false,
          recurringDays: [],
          recurringUntil: null,
          subjectIds,
          bookingId: null,
        },
      },
      { upsert: true },
    )
  }

  const teacherReviews = reviewTemplates[teacherIndex] ?? reviewTemplates[0]!
  for (const [reviewIndex, reviewerUser] of reviewerUsers.entries()) {
    await TeacherReviewModel.findOneAndUpdate(
      {
        teacherId: teacherUser._id,
        studentId: reviewerUser._id,
      },
      {
        $set: {
          rating: reviewIndex === 2 ? 4 : 5,
          review: teacherReviews[reviewIndex] ?? teacherReviews[0]!,
          isVisible: true,
          reportedAt: null,
          reportReason: null,
        },
      },
      { upsert: true, new: true, runValidators: true },
    )
  }
}

console.log(
  `Seed complete. Admin: ${env.ADMIN_EMAIL}. Demo teachers: ${demoTeachers.length}`,
)
process.exit(0)
