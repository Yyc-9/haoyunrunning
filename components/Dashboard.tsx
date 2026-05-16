'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Filter,
  Search,
  ChevronRight,
  Star,
  Award,
} from 'lucide-react'

interface Student {
  id: number
  name: string
  avatar: string
  level: string
  currentGoal: string
  lastActivity: string
  status: 'active' | 'inactive' | 'needs-attention'
  progress: number
  hasNewFeedback: boolean
}

interface Feedback {
  id: number
  studentId: number
  studentName: string
  date: string
  workout: string
  distance: string
  pace: string
  heartRate: string
  rpe: number
  comment: string
  needsResponse: boolean
  attachments: number
}

export default function Dashboard() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')

  const students: Student[] = [
    {
      id: 1,
      name: '张三',
      avatar: '张',
      level: '中级跑者',
      currentGoal: '全马破4小时',
      lastActivity: '2小时前',
      status: 'active',
      progress: 85,
      hasNewFeedback: true,
    },
    {
      id: 2,
      name: '李四',
      avatar: '李',
      level: '高级跑者',
      currentGoal: '全马破3小时',
      lastActivity: '5小时前',
      status: 'active',
      progress: 65,
      hasNewFeedback: false,
    },
    {
      id: 3,
      name: '王五',
      avatar: '王',
      level: '入门跑者',
      currentGoal: '完成半马',
      lastActivity: '1天前',
      status: 'needs-attention',
      progress: 45,
      hasNewFeedback: true,
    },
    {
      id: 4,
      name: '赵六',
      avatar: '赵',
      level: '中级跑者',
      currentGoal: '10公里破45分',
      lastActivity: '3天前',
      status: 'inactive',
      progress: 90,
      hasNewFeedback: false,
    },
    {
      id: 5,
      name: '孙七',
      avatar: '孙',
      level: '高级跑者',
      currentGoal: '越野跑100公里',
      lastActivity: '刚刚',
      status: 'active',
      progress: 75,
      hasNewFeedback: true,
    },
  ]

  const feedbacks: Feedback[] = [
    {
      id: 1,
      studentId: 1,
      studentName: '张三',
      date: '2026-05-14 08:30',
      workout: 'E跑 10km',
      distance: '10.5km',
      pace: '5:45/km',
      heartRate: '145',
      rpe: 6,
      comment: '今天状态不错，膝盖稍有不适',
      needsResponse: true,
      attachments: 2,
    },
    {
      id: 2,
      studentId: 3,
      studentName: '王五',
      date: '2026-05-13 18:45',
      workout: '间歇跑 8km',
      distance: '8.2km',
      pace: '4:50/km',
      heartRate: '165',
      rpe: 8,
      comment: '最后一组非常吃力，需要调整计划',
      needsResponse: true,
      attachments: 1,
    },
    {
      id: 3,
      studentId: 5,
      studentName: '孙七',
      date: '2026-05-13 06:15',
      workout: '长距离 25km',
      distance: '25.3km',
      pace: '5:20/km',
      heartRate: '155',
      rpe: 7,
      comment: '补给策略很有效，后程保持得很好',
      needsResponse: false,
      attachments: 3,
    },
  ]

  const stats = [
    { label: '活跃学员', value: '42', icon: Users, change: '+12%' },
    { label: '本周提交', value: '156', icon: TrendingUp, change: '+8%' },
    { label: '需回复', value: '8', icon: MessageSquare, change: '-3%' },
    { label: '达成目标', value: '23', icon: CheckCircle, change: '+15%' },
  ]

  const handleReply = (feedbackId: number) => {
    console.log('Reply to feedback:', feedbackId, 'with text:', replyText)
    setReplyText('')
  }

  const statusColor = (status: Student['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-apple-gray-100 text-apple-gray-800'
      case 'needs-attention':
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="min-h-screen bg-apple-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">教练看板</h1>
            <p className="text-apple-gray-600 mt-2">管理学员，查看训练反馈，提供指导</p>
          </div>
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apple-button-outline"
            >
              <Calendar className="h-4 w-4 inline-block mr-2" />
              周报生成
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apple-button-primary"
            >
              <Download className="h-4 w-4 inline-block mr-2" />
              导出数据
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="apple-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-apple-gray-600">{stat.label}</div>
              </div>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                stat.change.startsWith('+')
                  ? 'bg-green-100 text-green-600'
                  : stat.change.startsWith('-')
                  ? 'bg-red-100 text-red-600'
                  : 'bg-apple-gray-100 text-apple-gray-600'
              }`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span className={
                stat.change.startsWith('+')
                  ? 'text-green-600'
                  : stat.change.startsWith('-')
                  ? 'text-red-600'
                  : 'text-apple-gray-600'
              }>
                {stat.change} 较上周
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Students List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2"
        >
          <div className="apple-card p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                学员管理 ({students.length})
              </h2>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索学员..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="apple-input pl-10 w-full sm:w-64"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-outline px-4 py-2"
                >
                  <Filter className="h-4 w-4 inline-block mr-1" />
                  筛选
                </motion.button>
              </div>
            </div>

            <div className="space-y-4">
              {students
                .filter((student) =>
                  student.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((student) => (
                  <motion.div
                    key={student.id}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      selectedStudent?.id === student.id
                        ? 'border-apple-blue bg-apple-blue/5'
                        : 'border-apple-gray-200 hover:border-apple-gray-300'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center text-white font-bold">
                          {student.avatar}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{student.name}</h3>
                            {student.hasNewFeedback && (
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-apple-gray-600">
                            {student.level} • {student.currentGoal}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor(student.status)}`}>
                          {student.status === 'active' ? '活跃' :
                           student.status === 'inactive' ? '未活跃' : '需关注'}
                        </span>
                        <ChevronRight className="h-5 w-5 text-apple-gray-400" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-apple-gray-600 mb-1">
                        <span>训练进度</span>
                        <span>{student.progress}%</span>
                      </div>
                      <div className="h-2 bg-apple-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-apple-blue to-apple-orange"
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-apple-gray-500 mt-2 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        最后活动: {student.lastActivity}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>

          {/* Feedback List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="apple-card p-6 mt-8"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              待处理反馈 ({feedbacks.filter(f => f.needsResponse).length})
            </h2>
            <div className="space-y-6">
              {feedbacks
                .filter((feedback) => feedback.needsResponse)
                .map((feedback) => (
                  <div key={feedback.id} className="p-4 border border-apple-gray-200 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{feedback.studentName}</span>
                          <span className="text-xs bg-apple-blue/10 text-apple-blue rounded-full px-2 py-0.5">
                            {feedback.workout}
                          </span>
                        </div>
                        <div className="text-sm text-apple-gray-500 mt-1">
                          {feedback.date}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {feedback.attachments > 0 && (
                          <span className="text-xs bg-apple-gray-100 text-apple-gray-700 rounded-full px-2 py-1">
                            {feedback.attachments}个附件
                          </span>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-apple-blue hover:text-apple-blue/80"
                          onClick={() => {
                            // TODO: 查看附件
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-apple-gray-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-apple-gray-500">距离</div>
                        <div className="font-semibold">{feedback.distance}</div>
                      </div>
                      <div className="bg-apple-gray-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-apple-gray-500">配速</div>
                        <div className="font-semibold">{feedback.pace}</div>
                      </div>
                      <div className="bg-apple-gray-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-apple-gray-500">心率</div>
                        <div className="font-semibold">{feedback.heartRate}</div>
                      </div>
                      <div className="bg-apple-gray-50 rounded-xl p-2 text-center">
                        <div className="text-xs text-apple-gray-500">体感</div>
                        <div className="font-semibold">{feedback.rpe}/10</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-apple-gray-700">{feedback.comment}</div>
                    </div>

                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="给学员回复..."
                        className="apple-input flex-1"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReply(feedback.id)}
                        className="apple-button-primary px-6"
                      >
                        发送
                      </motion.button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Selected Student Card */}
          {selectedStudent ? (
            <div className="apple-card p-6">
              <div className="text-center mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {selectedStudent.avatar}
                </div>
                <h3 className="text-xl font-bold mb-2">{selectedStudent.name}</h3>
                <div className="text-apple-gray-600 mb-4">{selectedStudent.level}</div>
                <div className="bg-apple-gray-100 rounded-xl p-3">
                  <div className="text-sm text-apple-gray-500 mb-1">当前目标</div>
                  <div className="font-semibold">{selectedStudent.currentGoal}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-apple-gray-600 mb-1">
                    <span>训练进度</span>
                    <span>{selectedStudent.progress}%</span>
                  </div>
                  <div className="h-2 bg-apple-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-apple-blue to-apple-orange"
                      style={{ width: `${selectedStudent.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-apple-blue/5 rounded-xl p-3 text-center">
                    <div className="text-xs text-apple-gray-500">连续训练</div>
                    <div className="text-2xl font-bold text-apple-blue">12天</div>
                  </div>
                  <div className="bg-apple-orange/5 rounded-xl p-3 text-center">
                    <div className="text-xs text-apple-gray-500">完成率</div>
                    <div className="text-2xl font-bold text-apple-orange">94%</div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full apple-button-primary"
                >
                  查看详细报告
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="apple-card p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-apple-gray-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-apple-gray-400" />
              </div>
              <h3 className="font-semibold mb-2">选择学员</h3>
              <p className="text-apple-gray-600 text-sm">
                点击左侧学员列表以查看详细信息和统计数据
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="apple-card p-6">
            <h3 className="font-semibold mb-4">快速操作</h3>
            <div className="space-y-3">
              {[
                { icon: MessageSquare, label: '批量发送提醒', color: 'bg-apple-blue/10 text-apple-blue' },
                { icon: Star, label: '标记优秀学员', color: 'bg-yellow-500/10 text-yellow-600' },
                { icon: Award, label: '颁发成就徽章', color: 'bg-purple-500/10 text-purple-600' },
                { icon: Calendar, label: '安排集体训练', color: 'bg-green-500/10 text-green-600' },
              ].map((action, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center p-3 rounded-xl hover:bg-apple-gray-100 transition-colors duration-200"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center mr-3 ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="apple-card p-6">
            <h3 className="font-semibold mb-4">即将安排</h3>
            <div className="space-y-3">
              {[
                { time: '明天 08:00', title: '集体晨跑训练', participants: 12 },
                { time: '后天 19:00', title: '跑步技术讲座', participants: 25 },
                { time: '3天后 06:30', title: '节奏跑训练', participants: 8 },
              ].map((event, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 rounded-xl bg-apple-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-apple-gray-500 mt-1">
                      {event.time} • {event.participants}位学员
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="h-8 w-8 rounded-full bg-apple-gray-200 hover:bg-apple-gray-300 flex items-center justify-center"
                  >
                    <MessageSquare className="h-4 w-4 text-apple-gray-600" />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}