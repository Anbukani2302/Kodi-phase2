// components/Post.tsx
import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  MoreVertical,
  Trash2,
  Edit2,
  Flag,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Eye,
  Users,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { postService, PostComment as PostCommentType } from '../services/postService';
import type { Post } from '../services/postService';
import { BASE_URL } from '../services/api';

interface PostProps {
  post: Post;
  onLike: (postId: number, data: any) => void;
  onSave: (postId: number, data: any) => void;
  onShare: (postId: number) => void;
  onReport: (postId: number, reason: string, description: string) => void;
  onCommentAdded: () => void;
  onPostDeleted?: (postId: number) => void;
  onPostUpdated?: (post: Post) => void;
  currentUser: any;
  isDetailed?: boolean;
}

export default function Post({
  post,
  onLike,
  onSave,
  onShare,
  onReport,
  onCommentAdded,
  onPostDeleted,
  onPostUpdated,
  currentUser,
  isDetailed = false
}: PostProps) {
  const { t, language } = useLanguage();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [comments, setComments] = useState<PostCommentType[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mediaPreviewIndex, setMediaPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    const triggerLikeApi = async () => {
      try {
        // Hit the like API as requested (GET /api/posts/{id}/like/)
        // Note: Using GET as requested by the user, even though like is usually POST
        const response = await postService.likePost(post.id);
        
        // Update the UI state with the initial like status from API response
        if (response && response.data) {
          onLike(post.id, response.data);
        }
        
        console.log(`Like API hit for post ${post.id}`);
      } catch (error) {
        console.error('Error hitting like API on load:', error);
      }
    };
    triggerLikeApi();
  }, [post.id]);

  const isAuthor = currentUser?.id === post.author?.id;
  const hasMedia = post.media_count && post.media_count > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility?.toUpperCase()) {
      case 'PUBLIC':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'CONNECTIONS':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'CUSTOM':
        return <Lock className="h-4 w-4 text-amber-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility?.toUpperCase()) {
      case 'PUBLIC':
        return language === 'ta' ? 'பொது' : 'Public';
      case 'CONNECTIONS':
        return language === 'ta' ? 'இணைப்புகள்' : 'Connections';
      case 'CUSTOM':
        return language === 'ta' ? 'தனிப்பயன்' : 'Custom';
      default:
        return visibility || 'Unknown';
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${BASE_URL}${cleanUrl}`;
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await postService.getComments(post.id);
      setComments(response.results || response.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await postService.createComment(post.id, { content: commentText });
      setCommentText('');
      setShowCommentInput(false);
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await postService.likePost(post.id);
      // The API response data contains the updated engagement and interaction info
      onLike(post.id, response.data);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async () => {
    try {
      const response = await postService.savePost(post.id);
      onSave(post.id, response.data);
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleShare = async () => {
    try {
      const response = await postService.sharePost(post.id);
      onShare(post.id);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleUpdatePost = async () => {
    if (!editContent.trim()) return;
    setUpdating(true);
    try {
      const updatedPost = await postService.updatePost(post.id, { content: editContent });
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated(updatedPost);
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await postService.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    try {
      await postService.reportPost(post.id, reportReason, reportDescription);
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      onReport(post.id, reportReason, reportDescription);
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  const toggleComments = async () => {
    if (!showAllComments && comments.length === 0) {
      await fetchComments();
    }
    setShowAllComments(!showAllComments);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {/* Author Avatar */}
            <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-400 rounded-full flex items-center justify-center shadow-md shrink-0">
              {post.author?.profile_image ? (
                <img
                  src={getFullImageUrl(post.author.profile_image)}
                  alt={post.author.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Author Info */}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 hover:text-amber-600 cursor-pointer">
                  {post.author?.name || 'Unknown User'}
                </h3>
                <span className="text-xs text-gray-400">•</span>
                <div className="flex items-center space-x-1 text-gray-400">
                  {getVisibilityIcon(post.visibility)}
                  <span className="text-xs">{getVisibilityLabel(post.visibility)}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>{formatDate(post.created_at)}</span>
                {post.is_edited && (
                  <span className="italic">(edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 animate-scale-in">
                {isAuthor ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>{language === 'ta' ? 'திருத்து' : 'Edit'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{language === 'ta' ? 'நீக்கு' : 'Delete'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Flag className="h-4 w-4" />
                    <span>{language === 'ta' ? 'புகார் செய்' : 'Report'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mt-3">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-amber-50"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  onClick={handleUpdatePost}
                  disabled={updating || !editContent.trim()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{language === 'ta' ? 'சேமி' : 'Save'}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {/* Media Gallery */}
        {hasMedia && !isEditing && post.media && post.media.length > 0 && (
          <div className={`mt-4 grid gap-2 ${post.media.length === 1 ? 'grid-cols-1' :
              post.media.length === 2 ? 'grid-cols-2' :
                post.media.length === 3 ? 'grid-cols-2' :
                  'grid-cols-2'
            }`}>
            {post.media.slice(0, 4).map((media, index) => (
              <div
                key={media.id}
                className={`relative group cursor-pointer overflow-hidden rounded-xl bg-gray-100 ${post.media.length === 3 && index === 0 ? 'col-span-2' : ''
                  }`}
                style={{ paddingBottom: '75%' }}
                onClick={() => setMediaPreviewIndex(index)}
              >
                {media.media_type === 'image' ? (
                  <img
                    src={getFullImageUrl(media.file)}
                    alt={media.caption || `Media ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : media.media_type === 'video' ? (
                  <video
                    src={getFullImageUrl(media.file)}
                    className="absolute inset-0 w-full h-full object-cover"
                    poster={media.thumbnail ? getFullImageUrl(media.thumbnail) : undefined}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    {getMediaIcon(media.media_type)}
                    <span className="text-xs text-gray-500 ml-2">{media.file?.split('/').pop()}</span>
                  </div>
                )}

                {index === 3 && post.media.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+{post.media.length - 4}</span>
                  </div>
                )}

                {media.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {media.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Media Preview Modal */}
        {mediaPreviewIndex !== null && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setMediaPreviewIndex(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              onClick={() => setMediaPreviewIndex(null)}
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {post.media[mediaPreviewIndex]?.media_type === 'image' ? (
              <img
                src={getFullImageUrl(post.media[mediaPreviewIndex].file)}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : post.media[mediaPreviewIndex]?.media_type === 'video' ? (
              <video
                src={getFullImageUrl(post.media[mediaPreviewIndex].file)}
                controls
                autoPlay
                className="max-w-full max-h-[90vh]"
              />
            ) : (
              <div className="text-center text-white">
                {getMediaIcon(post.media[mediaPreviewIndex].media_type)}
                <p className="mt-2">{post.media[mediaPreviewIndex].file?.split('/').pop()}</p>
                <a
                  href={getFullImageUrl(post.media[mediaPreviewIndex].file)}
                  download
                  className="mt-4 inline-block px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  Download
                </a>
              </div>
            )}

            {/* Navigation Arrows */}
            {post.media.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : post.media.length - 1));
                  }}
                >
                  <ChevronDown className="h-6 w-6 text-white rotate-90" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaPreviewIndex((prev) => (prev! < post.media.length - 1 ? prev! + 1 : 0));
                  }}
                >
                  <ChevronDown className="h-6 w-6 text-white -rotate-90" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Heart className={`h-4 w-4 ${post.user_interaction?.is_liked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            <span>{post.engagement?.likes_count || 0} {post.engagement?.likes_count === 1 ? 'like' : 'likes'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={toggleComments} className="hover:text-amber-600 transition-colors">
              {post.engagement?.comments_count || 0} {post.engagement?.comments_count === 1 ? 'comment' : 'comments'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-colors ${post.user_interaction?.is_liked
              ? 'text-red-500 bg-red-50'
              : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
          <Heart className={`h-5 w-5 ${post.user_interaction?.is_liked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{language === 'ta' ? 'விருப்பம்' : 'Like'}</span>
        </button>

        <button
          onClick={() => {
            setShowCommentInput(!showCommentInput);
            if (!showAllComments && comments.length === 0 && !showCommentInput) {
              fetchComments();
            }
          }}
          className="flex-1 flex items-center justify-center space-x-2 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{language === 'ta' ? 'கருத்து' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments Section */}
      {(showCommentInput || showAllComments) && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          {/* Add Comment Input */}
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-br from-amber-500 to-orange-400 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={language === 'ta' ? 'கருத்து எழுதுங்கள்...' : 'Write a comment...'}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-600 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Comments List */}
          {showAllComments && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  {language === 'ta' ? 'இதுவரை கருத்துகள் எதுவும் இல்லை' : 'No comments yet'}
                </p>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    currentUserId={currentUser?.id}
                    onCommentDeleted={fetchComments}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {language === 'ta' ? 'பதிவை நீக்க வேண்டுமா?' : 'Delete Post?'}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'ta'
                  ? 'இந்த பதிவை நீக்கினால் மீண்டும் பெற முடியாது.'
                  : 'This action cannot be undone. The post will be permanently deleted.'}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    language === 'ta' ? 'நீக்கு' : 'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {language === 'ta' ? 'புகார் செய்' : 'Report Post'}
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ta' ? 'காரணம்' : 'Reason'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a reason</option>
                  <option value="SPAM">Spam</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="HATE_SPEECH">Hate speech</option>
                  <option value="VIOLENCE">Violence</option>
                  <option value="COPYRIGHT">Copyright violation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ta' ? 'விளக்கம்' : 'Description'}
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder={language === 'ta' ? 'கூடுதல் விவரங்கள்...' : 'Additional details...'}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {language === 'ta' ? 'புகார் செய்' : 'Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Comment Item Component
function CommentItem({
  comment,
  postId,
  currentUserId,
  onCommentDeleted
}: {
  comment: PostCommentType;
  postId: number;
  currentUserId: number;
  onCommentDeleted: () => void;
}) {
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = currentUserId === comment.author?.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString();
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    setUpdating(true);
    try {
      await postService.updateComment(postId, comment.id, { content: editContent });
      setIsEditing(false);
      onCommentDeleted();
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await postService.deleteComment(postId, comment.id);
      onCommentDeleted();
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await postService.createComment(postId, {
        content: replyContent,
        parent_id: comment.id
      });
      setIsReplying(false);
      setReplyContent('');
      onCommentDeleted();
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  return (
    <div className="group">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-linear-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center shrink-0">
          <span className="text-gray-600 font-bold text-xs">
            {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">
                {comment.author?.name || 'Unknown User'}
              </h4>
              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
            </div>

            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-sm p-2 border border-amber-200 rounded-lg focus:ring-1 focus:ring-amber-500 bg-amber-50"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
            )}
          </div>

          <div className="flex items-center space-x-3 mt-1 ml-2">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs text-gray-400 hover:text-amber-600 transition-colors"
            >
              Reply
            </button>
            {isAuthor && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Delete'}
                </button>
              </>
            )}
          </div>

          {isReplying && (
            <div className="mt-3 flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-amber-600 font-bold text-[10px]">R</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:ring-1 focus:ring-amber-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleReply();
                    }
                  }}
                />
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-600 disabled:opacity-30"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 ml-6 border-l-2 border-gray-100 pl-3 space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  currentUserId={currentUserId}
                  onCommentDeleted={onCommentDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}