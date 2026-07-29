<?php
namespace Account;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class Delete
{
    public function index(): void
    {
        Request::delete();
        $accountId = Session::userId();
        Query::begin();
        try {
            Activity::log(
                $accountId,
                'account_deleted',
                'Account deleted.'
            );
            Services::delete($accountId);
            Query::execute(
                "DELETE
                FROM accounts
                WHERE id = ?",
                [$accountId]
            );
            Query::commit();
        } catch (\Throwable $e) {
            Query::rollback();
            Response::error('Unable to delete account');
        }
        AuthSession::destroy();
        Response::success('Account deleted successfully');
    }
    public function schedule(): void
    {
        Request::patch();
        Query::execute(
            "UPDATE accounts
            SET deletion_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
            WHERE id = ?",
            [Session::userId()]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Account scheduled for deletion.'
        );
        AuthSession::destroy();
        Response::success(
            'Your account will be permanently deleted in 30 days.'
        );
    }
    public function cancel(): void
    {
        Request::patch();
        Query::execute(
            "UPDATE accounts
            SET deletion_scheduled_at = NULL
            WHERE id = ?",
            [Session::userId()]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Scheduled account deletion cancelled.'
        );
        Response::success(
            'Scheduled account deletion cancelled.'
        );
    }
}