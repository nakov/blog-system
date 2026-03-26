import {
  ApiPost,
  ApiUser,
  CreatePostInput,
  UpdatePostInput,
} from "@/types/blog";
import { getAuthHeaders } from "@/lib/client-auth";

type ApiErrorResponse = {
  error?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    const message =
      typeof (data as ApiErrorResponse)?.error === "string"
        ? (data as ApiErrorResponse).error
        : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

export async function registerUser(email: string, password: string) {
  return parseJson<{ user: ApiUser; token: string }>(
    await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function loginUser(email: string, password: string) {
  return parseJson<{ user: ApiUser; token: string }>(
    await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function fetchPosts(options?: {
  tag?: string;
  mine?: boolean;
  token?: string;
}): Promise<ApiPost[]> {
  const searchParams = new URLSearchParams();

  if (options?.tag) {
    searchParams.set("tag", options.tag);
  }

  if (options?.mine) {
    searchParams.set("mine", "true");
  }

  const query = searchParams.toString();
  const url = query.length > 0 ? `/api/posts?${query}` : "/api/posts";

  const response = await fetch(url, {
    headers: {
      ...getAuthHeaders(options?.token),
    },
  });

  const data = await parseJson<{ posts: ApiPost[] }>(response);
  return data.posts;
}

export async function fetchPostById(id: number): Promise<ApiPost> {
  const data = await parseJson<{ post: ApiPost }>(await fetch(`/api/posts/${id}`));
  return data.post;
}

export async function createPost(input: CreatePostInput, token: string) {
  const data = await parseJson<{ post: ApiPost }>(
    await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(input),
    })
  );

  return data.post;
}

export async function updatePost(id: number, input: UpdatePostInput, token: string) {
  const data = await parseJson<{ post: ApiPost }>(
    await fetch(`/api/posts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(input),
    })
  );

  return data.post;
}

export async function deletePost(id: number, token: string) {
  await parseJson<{ success: boolean }>(
    await fetch(`/api/posts/${id}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(token),
      },
    })
  );
}

export async function uploadPostCoverImage(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const data = await parseJson<{ url: string }>(
    await fetch("/api/posts/upload-image", {
      method: "POST",
      headers: {
        ...getAuthHeaders(token),
      },
      body: formData,
    })
  );

  return data.url;
}
