import api from './api';

export interface Post {
  id: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  post: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
}

export interface CreatePostData {
  content: string;
  image?: File | null;
}

export interface CreateCommentData {
  post: number;
  content: string;
}

class PostService {
  // GET /api/posts/ - Get all posts (feed)
  async getPosts(page: number = 1, limit: number = 10): Promise<{ results: Post[]; count: number }> {
    const response = await api.get('/api/posts/', {
      params: { page, limit },
    });
    return response.data;
  }

  // GET /api/posts/:id/ - Get single post
  async getPost(postId: number): Promise<Post> {
    const response = await api.get(`/api/posts/${postId}/`);
    return response.data;
  }

  // POST /api/posts/ - Create new post
  async createPost(postData: CreatePostData): Promise<Post> {
    const formData = new FormData();
    formData.append('content', postData.content);
    if (postData.image) {
      formData.append('image', postData.image);
    }

    const response = await api.post('/api/posts/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // PUT /api/posts/:id/ - Update post
  async updatePost(postId: number, postData: Partial<CreatePostData>): Promise<Post> {
    const response = await api.put(`/api/posts/${postId}/`, postData);
    return response.data;
  }

  // DELETE /api/posts/:id/ - Delete post
  async deletePost(postId: number): Promise<void> {
    await api.delete(`/api/posts/${postId}/`);
  }

  // POST /api/posts/:id/like/ - Like a post
  async likePost(postId: number): Promise<{ message: string; is_liked: boolean }> {
    const response = await api.post(`/api/posts/${postId}/like/`);
    return response.data;
  }

  // POST /api/posts/:id/unlike/ - Unlike a post
  async unlikePost(postId: number): Promise<{ message: string; is_liked: boolean }> {
    const response = await api.post(`/api/posts/${postId}/unlike/`);
    return response.data;
  }

  // POST /api/posts/:id/share/ - Share a post
  async sharePost(postId: number, content?: string): Promise<Post> {
    const response = await api.post(`/api/posts/${postId}/share/`, {
      content: content || '',
    });
    return response.data;
  }

  // GET /api/posts/:id/comments/ - Get comments for a post
  async getComments(postId: number): Promise<Comment[]> {
    const response = await api.get(`/api/posts/${postId}/comments/`);
    return response.data;
  }

  // POST /api/posts/:id/comments/ - Add comment to a post
  async createComment(postId: number, content: string): Promise<Comment> {
    const response = await api.post(`/api/posts/${postId}/comments/`, {
      content,
    });
    return response.data;
  }

  // DELETE /api/comments/:id/ - Delete a comment
  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/api/comments/${commentId}/`);
  }
}

export const postService = new PostService();
export default postService;
