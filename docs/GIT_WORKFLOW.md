# Quy trinh Gitflow

Tai lieu nay quy dinh cach lam viec voi Git cho repository. Muc tieu la dua
thay doi qua review va kiem thu truoc khi len production, dong thoi giu lich su
commit de truy vet theo issue.

## Nhanh va muc dich

| Nhanh | Muc dich | Cach cap nhat |
| --- | --- | --- |
| `prod` | Ma dang chay production | Chi merge Pull Request (PR) da duoc phe duyet va kiem thu |
| `staging` | QA, UAT va demo | Chi merge PR tu `dev` hoac dong bo sau hotfix |
| `dev` | Nhanh tich hop cua team | Nhan PR tu nhanh `feat/*` |
| `feat/<feature_name>` | Phat trien mot tinh nang | Tao tu `dev`; xoa sau khi merge |
| `hotfix/<hotfix_name>` | Sua loi khan cap tren production | Tao tu `prod`; xoa sau khi dong bo |

Nhanh `main` duoc giu lai de tuong thich voi cau hinh mac dinh cu. Quy trinh
phat hanh dung `prod` lam nhanh production.

## Quy uoc commit

Phan lon commit phai co ID issue o cuoi message. Dung Conventional Commits va
viet o the hien tai, ngan gon, ro nghia.

```text
<type>(<scope>): <mo ta> #<issue_id>
```

Vi du:

```text
feat(homepage): add hero section #123
fix(auth): resolve login redirect error #456
docs(git): update release procedure #789
chore(ci): update PHP version #321
```

`type` thuong dung: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`ci`. Cac commit khoi tao repository hoac thay doi hanh chinh khong co issue
can ghi ly do trong mo ta hoac PR.

## Phat trien tinh nang

1. Dong bo nhanh `dev`:

   ```bash
   git switch dev
   git pull --ff-only origin dev
   ```

2. Tao nhanh tinh nang tu `dev`:

   ```bash
   git switch -c feat/homepage
   ```

3. Lam viec, kiem tra va commit co issue ID:

   ```bash
   git add <files>
   git commit -m "feat(homepage): add landing page #123"
   git push -u origin feat/homepage
   ```

4. Tao PR `feat/homepage` -> `dev`. PR can duoc review va pass cac kiem tra
   bat buoc truoc khi merge. Cap nhat nhanh bang `git pull --rebase origin dev`
   neu PR bi xung dot.

5. Sau khi PR merge, xoa nhanh feature tren remote va local neu khong con can.

## Phat hanh len staging va production

Khi cac tinh nang tren `dev` da san sang kiem thu, tao PR `dev` -> `staging`.
QA/UAT kiem tra tren staging. Khi dat tieu chi phat hanh, tao PR `staging` ->
`prod` (uu tien) hoac `dev` -> `prod` neu staging va dev da duoc xac nhan cung
mot commit. Ghi ro pham vi phat hanh, ket qua kiem thu va rollback plan trong
PR phat hanh.

Khong merge truc tiep vao `prod`, `staging` hoac `dev`.

## Hotfix

Hotfix chi dung cho loi khan cap dang anh huong production.

1. Tao nhanh tu `prod`:

   ```bash
   git switch prod
   git pull --ff-only origin prod
   git switch -c hotfix/fix_login_error
   ```

2. Sua loi, kiem tra, commit va push:

   ```bash
   git add <files>
   git commit -m "fix(auth): resolve login error #456"
   git push -u origin hotfix/fix_login_error
   ```

3. Tao PR `hotfix/fix_login_error` -> `prod`; review, kiem thu va merge.

4. Tao hai PR dong bo `prod` -> `staging` va `prod` -> `dev`, sau do merge ca
hai. Buoc nay bat buoc de loi da sua khong quay lai o lan phat hanh sau.

## Bao ve nhanh tren GitHub

Git khong the tu cau hinh branch protection; can cau hinh trong GitHub:
`Settings` -> `Branches` -> `Add branch protection rule`.

Ap dung cho `prod` va `staging` (khuyen nghi ap dung ca `dev`):

- Bat `Require a pull request before merging`; toi thieu 1 approval.
- Bat `Require status checks to pass before merging` khi CI da co.
- Bat `Require conversation resolution before merging`.
- Bat `Do not allow bypassing the above settings` va tat force push/deletion.
- Han che quyen push truc tiep cho nhom release maintainer neu repository la
  organization repository.

Dat default branch la `dev` neu day la repository phuc vu phat trien hang ngay;
giu `prod` lam default neu can uu tien an toan cho code production. Neu doi
default branch, cap nhat cac link CI/CD va deployment dang tham chieu `main`.

## Lenh Git co ban

```bash
git clone <repository-url>       # Tai repository da ton tai
git init                         # Khoi tao repository moi
git status                       # Xem trang thai thay doi
git add <files>                  # Dua thay doi vao staging area
git commit -m "... #123"         # Tao commit
git pull --ff-only origin <branch> # Dong bo an toan
git push origin <branch>         # Day nhanh len remote
```

Truoc khi bat dau cong viec, luon kiem tra `git status` va dong bo nhanh goc.
Khong dung force push voi nhanh dung chung (`prod`, `staging`, `dev`).
